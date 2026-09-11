import { createSign } from 'node:crypto';

interface CachedToken {
  token: string;
  exp: number;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; date: string };
  end: { dateTime: string; date: string };
  description?: string;
}

export class GoogleCalendarApi {
  private serviceAccountJson: string;
  private calendarId: string;
  private cachedToken: CachedToken | null = null;

  constructor(serviceAccountJsonBase64: string, calendarId: string) {
    try {
      // Decode base64 to verify it's valid JSON
      const decoded = Buffer.from(serviceAccountJsonBase64, 'base64').toString('utf-8');
      JSON.parse(decoded);
      this.serviceAccountJson = serviceAccountJsonBase64;
    } catch (error) {
      console.warn('Warning: Service account JSON is not properly configured');
      this.serviceAccountJson = '';
    }
    this.calendarId = calendarId;
  }

  /**
   * Base64 URL-safe encoding
   */
  private b64url(input: Buffer | string): string {
    const buf = typeof input === 'string' ? Buffer.from(input) : input;
    return buf
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  /**
   * Get access token using JWT authentication
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.cachedToken && this.cachedToken.exp > Date.now() / 1000 + 60) {
      return this.cachedToken.token;
    }

    if (!this.serviceAccountJson) {
      throw new Error('Google service account JSON is not configured');
    }

    const decoded = Buffer.from(this.serviceAccountJson, 'base64').toString('utf-8');
    const key = JSON.parse(decoded);

    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };

    const unsigned = `${this.b64url(JSON.stringify(header))}.${this.b64url(JSON.stringify(claims))}`;
    const signer = createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = this.b64url(signer.sign(key.private_key));
    const jwt = `${unsigned}.${signature}`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    const data = await response.json() as { access_token: string; expires_in: number; error?: string; error_description?: string };

    if (!response.ok) {
      throw new Error(`Google token error: ${data.error_description || data.error}`);
    }

    this.cachedToken = { token: data.access_token, exp: now + data.expires_in };
    return data.access_token;
  }

  /**
   * Make authenticated request to Google Calendar API
   */
  private async apiRequest(path: string, init: RequestInit = {}): Promise<any> {
    const token = await this.getAccessToken();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}${path}`;

    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json() as { error?: { message: string } };

    if (!response.ok) {
      throw new Error(data.error?.message || `Google Calendar error: ${response.status}`);
    }

    return data;
  }

  /**
   * Get Vienna timezone offset for a given date
   */
  private getViennaOffset(dateStr: string): string {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Vienna',
      timeZoneName: 'shortOffset'
    });
    const parts = dtf.formatToParts(new Date(`${dateStr}T12:00:00Z`));
    const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+1';
    const match = tzPart.match(/GMT([+-]\d+)/);
    const hours = match ? parseInt(match[1], 10) : 1;
    const sign = hours >= 0 ? '+' : '-';
    return `${sign}${String(Math.abs(hours)).padStart(2, '0')}:00`;
  }

  /**
   * Get calendar events for this week
   */
  async getWeekEvents(): Promise<CalendarEvent[]> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4); // Friday

    const startDateStr = startOfWeek.toISOString().split('T')[0];
    const endDateStr = endOfWeek.toISOString().split('T')[0];

    const startDateTime = `${startDateStr}T00:00:00${this.getViennaOffset(startDateStr)}`;
    const endDateTime = `${endDateStr}T23:59:59${this.getViennaOffset(endDateStr)}`;

    const data = await this.apiRequest('/events', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Filter events for this week
    return (data.items || [])
      .filter((event: CalendarEvent) => {
        const eventStart = event.start.dateTime || event.start.date;
        return eventStart >= startDateStr && eventStart <= `${endDateStr}T23:59:59`;
      })
      .map((event: CalendarEvent) => ({
        id: event.id,
        summary: event.summary,
        start: event.start,
        end: event.end,
        description: event.description
      }));
  }

  /**
   * Create event in calendar
   */
  async createEvent(title: string, startTime: string, endTime: string, description?: string): Promise<CalendarEvent> {
    const event = {
      summary: title,
      description: description || '',
      start: { dateTime: startTime, timeZone: 'Europe/Vienna' },
      end: { dateTime: endTime, timeZone: 'Europe/Vienna' }
    };

    const data = await this.apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify(event)
    });

    return {
      id: data.id,
      summary: data.summary,
      start: data.start,
      end: data.end,
      description: data.description
    };
  }

  /**
   * Update event in calendar
   */
  async updateEvent(eventId: string, updates: Record<string, any>): Promise<CalendarEvent> {
    const data = await this.apiRequest(`/events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });

    return {
      id: data.id,
      summary: data.summary,
      start: data.start,
      end: data.end,
      description: data.description
    };
  }

  /**
   * Delete event from calendar
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.apiRequest(`/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE'
    });
  }
}

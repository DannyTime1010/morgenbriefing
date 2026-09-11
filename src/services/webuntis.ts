import axios from 'axios';

interface TimetableLesson {
  id: number;
  date: number;
  startTime: number;
  endTime: number;
  klasse: Array<{ id: number; name: string }>;
  te: Array<{ id: number; name: string }>;
  su: Array<{ id: number; name: string }>;
  ro: Array<{ id: number; name: string }>;
  text?: string;
  code?: string;
  lstext?: string;
  statflags?: string;
}

interface ProcessedLesson {
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
  class: string;
}

export class WebUntisApi {
  private baseUrl: string;
  private school: string;
  private username: string;
  private password: string;
  private sessionId: string | null = null;
  private personId: number | null = null;
  private personType: number = 5; // 5 = Student

  constructor(baseUrl: string, school: string, username: string, password: string) {
    this.baseUrl = baseUrl;
    this.school = school;
    this.username = username;
    this.password = password;
  }

  /**
   * Login to Web Untis and get session ID
   */
  async login(): Promise<void> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/WebUntis/jsonrpc.do?school=${encodeURIComponent(this.school)}`,
        {
          params: {
            m: 'authenticate',
            user: this.username,
            password: this.password,
            client: 'MorgenBriefing/1.0'
          }
        }
      );

      if (response.data.result) {
        this.sessionId = response.data.result.sessionId;
        this.personId = response.data.result.personId;
        console.log('✅ Web Untis Login erfolgreich');
      } else {
        throw new Error('Login failed: No session ID');
      }
    } catch (error) {
      console.error('Web Untis Login Error:', error);
      throw new Error('Web Untis login failed');
    }
  }

  /**
   * Make authenticated request to Web Untis API
   */
  private async apiRequest(method: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.sessionId) {
      await this.login();
    }

    const payload = {
      id: 'id',
      method,
      params: {
        ...params,
        sessionId: this.sessionId
      },
      jsonrpc: '2.0'
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/WebUntis/jsonrpc.do?school=${encodeURIComponent(this.school)}`,
        payload
      );

      if (response.data.error) {
        throw new Error(`Web Untis Error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      // Try to login again if session expired
      this.sessionId = null;
      await this.login();
      return this.apiRequest(method, params);
    }
  }

  /**
   * Convert Web Untis date format (YYYYMMDD) to ISO string
   */
  private convertDate(untisDate: number): string {
    const dateStr = untisDate.toString();
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  }

  /**
   * Convert time format (HHMM) to HH:MM
   */
  private convertTime(untisTime: number): string {
    const timeStr = untisTime.toString().padStart(4, '0');
    return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
  }

  /**
   * Get today's timetable
   */
  async getTodayTimetable(): Promise<ProcessedLesson[]> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const untisDate = parseInt(dateStr);

    const timetable = await this.getTimetableForDate(untisDate);
    return timetable;
  }

  /**
   * Get this week's timetable
   */
  async getWeekTimetable(): Promise<Record<string, ProcessedLesson[]>> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

    const weekData: Record<string, ProcessedLesson[]> = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
      const untisDate = parseInt(dateStr);

      const timetable = await this.getTimetableForDate(untisDate);
      weekData[days[i]] = timetable;
    }

    return weekData;
  }

  /**
   * Get timetable for specific date
   */
  async getDateTimetable(dateStr: string): Promise<ProcessedLesson[]> {
    const untisDate = parseInt(dateStr.replace(/-/g, ''));
    return this.getTimetableForDate(untisDate);
  }

  /**
   * Get raw timetable for a specific Untis date
   */
  private async getTimetableForDate(untisDate: number): Promise<ProcessedLesson[]> {
    try {
      const lessons = await this.apiRequest('getTimetable', {
        type: this.personType,
        id: this.personId,
        date: untisDate
      });

      return lessons.map((lesson: TimetableLesson) => ({
        date: this.convertDate(lesson.date),
        startTime: this.convertTime(lesson.startTime),
        endTime: this.convertTime(lesson.endTime),
        subject: lesson.su?.[0]?.name || 'Unknown',
        teacher: lesson.te?.[0]?.name || 'Unknown',
        room: lesson.ro?.[0]?.name || 'Unknown',
        class: lesson.klasse?.[0]?.name || 'Unknown'
      }));
    } catch (error) {
      console.error(`Error getting timetable for ${untisDate}:`, error);
      throw error;
    }
  }
}

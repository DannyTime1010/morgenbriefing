import express, { Request, Response } from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { WebUntisApi } from './services/webuntis.js';
import { GoogleCalendarApi } from './services/google-calendar.js';
import { NotionApi } from './services/notion.js';

dotenv.config();

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // 5 minute default TTL

// Middleware
app.use(cors());
app.use(express.json());

// Services
const untis = new WebUntisApi(
  process.env.UNTIS_URL || 'https://untis.webuntis.com',
  process.env.UNTIS_SCHOOL || 'HTBLUVA St. Pölten',
  process.env.UNTIS_USERNAME || 'RauchDan',
  process.env.UNTIS_PASSWORD || 'ImgSaF111!'
);

const googleCalendar = new GoogleCalendarApi(
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
  process.env.GOOGLE_CALENDAR_ID || ''
);

const notion = new NotionApi(
  process.env.NOTION_TOKEN || '',
  process.env.NOTION_TODOS_DATABASE_ID || '',
  process.env.NOTION_CALENDAR_DATABASE_ID || ''
);

// ============= WEB UNTIS ENDPOINTS =============

/**
 * Get today's timetable from Web Untis
 */
app.get('/api/untis/today', async (req: Request, res: Response) => {
  try {
    const cacheKey = `untis-today-${new Date().toISOString().split('T')[0]}`;
    let data = cache.get(cacheKey);

    if (!data) {
      data = await untis.getTodayTimetable();
      cache.set(cacheKey, data);
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Get this week's timetable from Web Untis
 */
app.get('/api/untis/week', async (req: Request, res: Response) => {
  try {
    const cacheKey = `untis-week-${new Date().toISOString().split('T')[0]}`;
    let data = cache.get(cacheKey);

    if (!data) {
      data = await untis.getWeekTimetable();
      cache.set(cacheKey, data);
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Get timetable for specific date
 */
app.get('/api/untis/date/:date', async (req: Request, res: Response) => {
  try {
    const date = req.params.date;
    const cacheKey = `untis-date-${date}`;
    let data = cache.get(cacheKey);

    if (!data) {
      data = await untis.getDateTimetable(date);
      cache.set(cacheKey, data);
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ============= GOOGLE CALENDAR ENDPOINTS =============

/**
 * Get calendar events for this week
 */
app.get('/api/calendar/week', async (req: Request, res: Response) => {
  try {
    const cacheKey = `calendar-week-${new Date().toISOString().split('T')[0]}`;
    let data = cache.get(cacheKey);

    if (!data) {
      data = await googleCalendar.getWeekEvents();
      cache.set(cacheKey, data);
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Create event in Google Calendar
 */
app.post('/api/calendar/event', async (req: Request, res: Response) => {
  try {
    const { title, startTime, endTime, description } = req.body;
    const result = await googleCalendar.createEvent(title, startTime, endTime, description);

    // Invalidate cache
    cache.keys().forEach(key => {
      if (key.startsWith('calendar-')) {
        cache.del(key);
      }
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ============= NOTION ENDPOINTS =============

/**
 * Get todos from Notion
 */
app.get('/api/notion/todos', async (req: Request, res: Response) => {
  try {
    const cacheKey = 'notion-todos';
    let data = cache.get(cacheKey);

    if (!data) {
      data = await notion.getTodos();
      cache.set(cacheKey, data, 600); // 10 minute TTL for todos
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Create a new todo in Notion
 */
app.post('/api/notion/todo', async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const result = await notion.createTodo(title, description);

    // Invalidate cache
    cache.del('notion-todos');

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Toggle todo completion status
 */
app.patch('/api/notion/todo/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const result = await notion.updateTodo(id, completed);

    // Invalidate cache
    cache.del('notion-todos');

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ============= COMBINED DATA ENDPOINT =============

/**
 * Get all data for the dashboard (optimized)
 */
app.get('/api/dashboard', async (req: Request, res: Response) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const cacheKey = `dashboard-${date}`;
    let cached = cache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const [untisToday, untisWeek, calendarWeek, todos] = await Promise.all([
      untis.getTodayTimetable(),
      untis.getWeekTimetable(),
      googleCalendar.getWeekEvents(),
      notion.getTodos()
    ]);

    const dashboardData = {
      untis: {
        today: untisToday,
        week: untisWeek
      },
      calendar: calendarWeek,
      todos: todos,
      timestamp: new Date().toISOString()
    };

    cache.set(cacheKey, dashboardData);

    res.json({
      success: true,
      data: dashboardData,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ============= HEALTH CHECK =============

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============= SCHEDULED DATA REFRESH =============

// Refresh cache every 5 minutes during school hours (7:50 - 14:00)
cron.schedule('*/5 7-14 * * 1-5', async () => {
  console.log('Refreshing cached data...');
  try {
    const date = new Date().toISOString().split('T')[0];
    const untisToday = await untis.getTodayTimetable();
    const untisWeek = await untis.getWeekTimetable();
    const calendarWeek = await googleCalendar.getWeekEvents();

    cache.set(`untis-today-${date}`, untisToday);
    cache.set(`untis-week-${date}`, untisWeek);
    cache.set(`calendar-week-${date}`, calendarWeek);
    console.log('Cache refreshed successfully');
  } catch (error) {
    console.error('Error refreshing cache:', error);
  }
});

// ============= SERVER START =============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌅 Morgenbriefing Cloud Server running on port ${PORT}`);
  console.log(`📅 Web Untis: ${process.env.UNTIS_SCHOOL}`);
  console.log(`🗓️  Google Calendar: Connected`);
  console.log(`📝 Notion: Connected`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});

export default app;

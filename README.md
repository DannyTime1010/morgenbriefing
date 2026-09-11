# 🌅 Morgenbriefing - Cloud Edition

A modern, offline-capable morning briefing dashboard with Web Untis school schedule integration, Google Calendar, and Notion tasks.

## Features

✅ **Web Untis Integration** - Real-time school schedule with custom overlay
✅ **Google Calendar** - Synchronized calendar events
✅ **Notion Integration** - To-do lists and task management
✅ **Offline Support** - Service Worker caching for offline access
✅ **Multi-Device** - Access from phone, PC, tablet - any device
✅ **Auto-Sync** - Data refreshes automatically during school hours
✅ **Responsive Design** - Beautiful UI on all screen sizes

## Architecture

```
morgenbriefing-server/
├── src/
│   ├── server.ts              # Express backend
│   └── services/
│       ├── webuntis.ts        # Web Untis API integration
│       ├── google-calendar.ts # Google Calendar API
│       └── notion.ts          # Notion API integration
├── public/
│   ├── index.html             # Frontend (offline-capable)
│   └── sw.js                  # Service Worker
├── package.json
├── tsconfig.json
└── .env.example
```

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```

3. **Set credentials in `.env`:**

   **Web Untis:**
   - Already configured with your school and credentials
   
   **Google Calendar:**
   - Create service account in Google Cloud Console
   - Download the JSON key and encode to base64:
     ```bash
     cat your-service-account.json | base64 | tr -d '\n'
     ```
   - Set `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_CALENDAR_ID`

   **Notion:**
   - Create Notion integration at https://www.notion.so/my-integrations
   - Get API token
   - Create databases for todos and calendar
   - Set `NOTION_TOKEN`, `NOTION_TODOS_DATABASE_ID`, `NOTION_CALENDAR_DATABASE_ID`

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Deployment to Railway

### Step 1: Prepare Repository
```bash
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Connect to Railway
1. Go to https://railway.app
2. Create new project → "Deploy from GitHub"
3. Connect your GitHub repository
4. Railway auto-detects Node.js and installs dependencies

### Step 3: Configure Environment Variables
In Railway dashboard:
1. Go to Project Settings → Variables
2. Add all variables from `.env`:
   - `UNTIS_URL`
   - `UNTIS_SCHOOL`
   - `UNTIS_USERNAME`
   - `UNTIS_PASSWORD`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`
   - `GOOGLE_CALENDAR_ID`
   - `NOTION_TOKEN`
   - `NOTION_TODOS_DATABASE_ID`
   - `NOTION_CALENDAR_DATABASE_ID`
   - `PORT` (leave as Railway-assigned)
   - `NODE_ENV=production`

### Step 4: Configure Start Command
In Railway Settings:
- **Start Command**: `npm run build && npm start`
- **Build Command**: (leave empty - Railway handles it)

### Step 5: Deploy
Push to GitHub - Railway automatically deploys

## Deployment to Render

### Step 1: Create Render Account
Go to https://render.com and sign up

### Step 2: Create New Service
1. Click "New +" → "Web Service"
2. Connect GitHub repository
3. Configure:
   - **Name**: `morgenbriefing`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Step 3: Configure Environment
In Environment tab, add:
- `UNTIS_URL`
- `UNTIS_SCHOOL`
- `UNTIS_USERNAME`
- `UNTIS_PASSWORD`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_CALENDAR_ID`
- `NOTION_TOKEN`
- `NOTION_TODOS_DATABASE_ID`
- `NOTION_CALENDAR_DATABASE_ID`
- `NODE_ENV=production`

### Step 4: Deploy
Click "Create Web Service" - deployment starts automatically

## How to Get Credentials

### Google Calendar API

1. **Create service account:**
   - Go to Google Cloud Console → morgenbriefing project
   - IAM & Admin → Service Accounts
   - Create Service Account (or use existing)
   - Keys → Add Key → JSON
   - Download the JSON file

2. **Encode to base64:**
   ```bash
   cat downloaded-key.json | base64 | tr -d '\n'
   ```

3. **Get Calendar ID:**
   - Google Calendar → Settings
   - Calendar ID is shown in "Calendar details"

### Notion

1. **Create integration:**
   - Go to https://www.notion.so/my-integrations
   - "Create new integration"
   - Copy the API token

2. **Create databases:**
   - Create "Todos" database with Title and Completed properties
   - Create "Calendar" database with Title and Date properties
   - Copy the database IDs from the URL or share menu

3. **Share databases with integration:**
   - Open database → Share → Select your integration

### Web Untis

Already configured with your credentials:
- School: `HTBLUVA St. Pölten`
- Username: `RauchDan`
- Password: `ImgSaF111!`

## API Endpoints

### Web Untis
- `GET /api/untis/today` - Today's timetable
- `GET /api/untis/week` - This week's timetable
- `GET /api/untis/date/:date` - Specific date timetable

### Google Calendar
- `GET /api/calendar/week` - Week's events
- `POST /api/calendar/event` - Create event

### Notion
- `GET /api/notion/todos` - Get todos
- `POST /api/notion/todo` - Create todo
- `PATCH /api/notion/todo/:id` - Update todo

### Combined
- `GET /api/dashboard` - All data at once

## Frontend Features

- **Offline Access** - Service Worker caches data
- **Auto-Refresh** - Data updates every 5 minutes during school hours
- **Responsive** - Mobile, tablet, desktop optimized
- **Real-time Updates** - Instant sync across devices
- **Status Indicator** - Shows when offline with last update time

## Troubleshooting

### "Login failed"
- Check Web Untis credentials
- Verify school name matches exactly

### "Google token error"
- Verify service account JSON is valid
- Check if base64 encoding is correct
- Ensure service account has Calendar API access

### "Notion error"
- Check if integration is shared with databases
- Verify database IDs are correct
- Ensure properties match (Title, Completed, Date)

### Offline mode not working
- Clear browser cache
- Check if Service Worker is registered
- Verify browser supports Service Workers

## Support

For issues or questions, check the Web Untis, Google Cloud, or Notion documentation.

## License

MIT

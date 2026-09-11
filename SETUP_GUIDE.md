# 🚀 Morgenbriefing Cloud - Setup Guide

## What Has Been Built

I've created a complete cloud-based Morgenbriefing system with:

✅ **Backend Server** (Node.js + Express)
- Web Untis integration (JSON-RPC API)
- Google Calendar API support
- Notion API integration
- Automatic caching and data refresh
- Health checks and monitoring

✅ **Frontend** (HTML + Service Worker)
- Beautiful responsive design (Beige/Moss green theme)
- Today's schedule with Web Untis overlay
- Google Calendar week view
- Notion todos list
- New entry form
- Full offline support with caching
- Automatic data synchronization

✅ **Offline-First Architecture**
- Service Worker for offline access
- Intelligent caching strategy
- Network-first for APIs, Cache-first for assets
- Offline status indicator with last update time

## Next Steps to Deploy

### 1. Get Your Credentials Ready

**Google Calendar Setup:**
1. Go to Google Cloud Console (already open with your morgenbriefing project)
2. Navigate to: IAM & Admin → Service Accounts
3. Click on "morgenbriefing-kalender" service account
4. Go to "Keys" tab
5. Click "Add Key" → "Create new key" → JSON
6. Download the JSON file
7. Encode to base64:
   ```
   On Windows (PowerShell):
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes('C:\path\to\key.json')) | Set-Clipboard
   
   Or use an online tool: https://www.base64encode.org
   ```
8. Also get your Calendar ID from Google Calendar → Settings

**Notion Setup:**
1. Go to https://www.notion.so/my-integrations
2. Click "Create new integration" 
3. Name it "Morgenbriefing"
4. Copy the API token
5. In Notion, create two databases:
   - "Todos" with properties: Title, Completed (checkbox)
   - "Calendar" with properties: Title, Date
6. Share both with your integration
7. Copy the database IDs from the URLs

### 2. Create .env File

In the morgenbriefing-server folder, create `.env`:

```
UNTIS_URL=https://untis.webuntis.com
UNTIS_SCHOOL=HTBLUVA St. Pölten
UNTIS_USERNAME=RauchDan
UNTIS_PASSWORD=ImgSaF111!

GOOGLE_SERVICE_ACCOUNT_JSON=YOUR_BASE64_KEY_HERE
GOOGLE_CALENDAR_ID=YOUR_CALENDAR_ID_HERE

NOTION_TOKEN=YOUR_NOTION_TOKEN_HERE
NOTION_TODOS_DATABASE_ID=YOUR_TODOS_DB_ID
NOTION_CALENDAR_DATABASE_ID=YOUR_CALENDAR_DB_ID

PORT=3000
NODE_ENV=production
```

### 3. Local Testing (Optional)

```bash
cd morgenbriefing-server
npm install
npm run dev
```

Then open http://localhost:3000 in your browser

### 4. Deploy to Railway or Render

**Choose One:**

**Option A: Railway (Recommended - Simpler)**
1. Go to https://railway.app
2. Login with GitHub
3. "New Project" → "Deploy from GitHub"
4. Select this repository
5. Add environment variables (from your .env)
6. Deploy starts automatically
7. You get a free URL like: `https://morgenbriefing-abc123.railway.app`

**Option B: Render**
1. Go to https://render.com
2. "New Web Service"
3. Connect GitHub
4. Set build command: `npm install && npm run build`
5. Set start command: `npm start`
6. Add environment variables
7. Deploy

### 5. Access Your Dashboard

Once deployed, you can access it from:
- 📱 Phone
- 💻 PC
- 🖥️ Any device
- Works offline too!

## File Structure Explanation

```
morgenbriefing-server/
├── src/server.ts                    # Main Express server
├── src/services/
│   ├── webuntis.ts                 # Web Untis API client
│   ├── google-calendar.ts          # Google Calendar API client
│   └── notion.ts                   # Notion API client
├── public/
│   ├── index.html                  # Frontend (offline-capable)
│   └── sw.js                       # Service Worker
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript config
├── .env.example                    # Environment template
└── README.md                       # Full documentation
```

## How It Works

1. **Backend Server** listens on port 3000
2. **Frontend** makes API calls to backend
3. **Service Worker** caches responses for offline use
4. **Cron job** refreshes data every 5 minutes (school hours only)
5. **Multi-device sync** - same server for all devices
6. **Offline mode** - uses cached data, shows status indicator

## Access from Multiple Devices

Once deployed:

**From Phone:**
- Open browser
- Go to: `https://your-railway-url.railway.app`
- Bookmark it
- Works offline after first load

**From PC:**
- Same URL
- No installation needed
- Bookmark for quick access

**Automatic Sync:**
- Open on multiple devices
- Data syncs automatically every 5 minutes
- No device needs to be always online

## Security Notes

✅ Credentials stored safely on server only
✅ Frontend is static (no sensitive data)
✅ Each API call authenticated server-side
✅ Service Worker only caches safe data
✅ Works fine offline (no credential exposure)

## Support

If you have issues:

1. **Web Untis errors** - Check credentials in .env
2. **Google Calendar errors** - Verify base64 encoding of key
3. **Notion errors** - Check database IDs and integration sharing
4. **Offline not working** - Clear browser cache, reload
5. **Deployment issues** - Check logs on Railway/Render dashboard

---

**Ready to deploy?** Follow steps 1-4 above. Once you have the deployment URL, send it to me and I'll verify everything is working!

# Daily News Fetch - Internal Cron System

## Built-in Cron Job System
This application now includes a built-in cron job system that automatically fetches news daily at 6:00 AM (Europe/Amsterdam timezone) without requiring external services.

## Automatic Startup
The cron job automatically starts when:
- The app runs in production mode (`NODE_ENV=production`)
- The environment variable `ENABLE_CRON=true` is set

## API Endpoints

### Start Cron Job
```
POST /api/cron/start
```
Manually starts the daily news fetch cron job.

### Check Status
```
GET /api/cron/status
```
Returns the current status of all cron jobs.

### Manual Trigger
```
POST /api/cron/trigger
```
Manually triggers a news fetch immediately (for testing).

## Environment Variables
Add to your `.env.local` file:
```
ENABLE_CRON=true  # Enable cron jobs in development
```

## Development Testing
1. Set `ENABLE_CRON=true` in your environment
2. Start the development server: `npm run dev`
3. Check status: `GET http://localhost:3000/api/cron/status`
4. Manual trigger: `POST http://localhost:3000/api/cron/trigger`

## Production Deployment
The cron job will automatically start when deployed in production mode. No additional configuration needed.

## Schedule
- **Frequency**: Daily at 6:00 AM
- **Timezone**: Europe/Amsterdam
- **What it does**:
  - Fetches all RSS feeds for all categories
  - Checks for duplicate articles
  - Adds new articles to Airtable
  - Logs the operation results

## Monitoring
Check the application logs to monitor cron job execution. All cron operations are prefixed with `[CRON]` for easy filtering.
# Activity Cadence

Automated weekly activity scheduler that runs every Monday at 09:00 Amsterdam time to create a perfectly balanced weekly schedule for Tennis, Gym, Coding, and Writing activities.

## Features

- **Automated Scheduling**: Runs every Monday at 09:00 to plan the upcoming week
- **Smart Conflict Resolution**: Integrates with multiple calendars (Primary, LMS, Outlook) to avoid conflicts
- **Rule-Based Scheduling**: Implements complex scheduling rules (Tennis/Gym spacing, Writing time preferences, etc.)
- **Multi-Platform Output**: Creates Google Calendar events, Notion summary pages, and email reports
- **Timezone Aware**: Handles Europe/Amsterdam timezone properly

## Scheduling Rules

1. **Business Hours**: 08:00–21:00 only
2. **Buffer Time**: 30 minutes between any two events
3. **Tennis & Gym**: Cannot be on same day, must have 1+ day gap between same type
4. **Writing**: Prefers 08:00–10:00 or 16:00–18:00, avoids Tennis/Gym days
5. **Coding**: Maximum 1 session per day
6. **Conflict Avoidance**: No overlaps with existing calendar events

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Configure the following in your `.env` file:

**Google APIs** (OAuth2 credentials):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` 
- `GOOGLE_REFRESH_TOKEN`

**Notion API**:
- `NOTION_API_KEY`
- Database IDs are pre-configured in `.env.example`

**Gmail API** (OAuth2 credentials):
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`

### 3. API Setup Guide

**Google Calendar & Gmail APIs**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project and enable Calendar API & Gmail API
3. Create OAuth2 credentials
4. Use OAuth2 Playground to get refresh token

**Notion API**:
1. Go to [Notion Developers](https://developers.notion.com)
2. Create integration and get API key
3. Share your activity database with the integration

### 4. Build and Run

```bash
npm run build
npm start
```

## Usage

### Command Line Options

```bash
# Test run (no actual events created)
npm run test-run

# Run scheduling immediately  
npm run run-now

# Start cron scheduler (runs every Monday 09:00)
npm run dev
```

### Scheduled Operation

The application runs automatically every Monday at 09:00 Amsterdam time:
1. Fetches activity preferences from Notion
2. Checks calendar conflicts across all calendars
3. Generates optimal weekly schedule
4. Creates Google Calendar events
5. Writes Notion summary page
6. Sends email summary

## Expected Notion Database Structure

Your Notion database should have these properties:
- `session` (text): Tennis, Gym, Building, Writing
- `times_a_week` (number): Sessions per week
- `duration_minutes` (number): Length of each session
- `emoji` (text): 🎾, 🏋️, 💻, 📝

## Calendar Integration

**Target Calendar**: asaf.rosenberg@gmail.com (where events are created)

**Conflict Calendars** (checked for busy times):
- Primary Google Calendar
- LMS/Canvas Calendar
- Outlook Calendar

## Development

```bash
npm run dev          # Development with auto-restart
npm run test-run     # Test without creating events
npm run build        # Build TypeScript
npm run lint         # ESLint
npm run typecheck    # TypeScript checking
```

## Project Structure

```
src/
├── connectors/              # API integrations
│   ├── google-calendar.ts   # Calendar event management
│   ├── notion.ts           # Activity preferences & summaries
│   └── gmail.ts            # Email notifications
├── utils/                  # Core utilities
│   ├── scheduler.ts        # Main scheduling algorithm
│   ├── date-helpers.ts     # Timezone & date utilities
│   ├── content-formatter.ts# Summary formatting
│   └── config.ts           # Environment configuration
├── types/                  # TypeScript definitions
├── scheduler-service.ts    # Main orchestration service
└── index.ts               # Entry point & cron setup
```

## Monitoring

The application provides detailed logging:
- 🚀 Startup and configuration
- 📋 Activity preference fetching
- 📆 Calendar conflict checking  
- 🧠 Schedule generation
- ✅ Event creation and notifications
- 📊 Final scheduling summary

## Error Handling

- Graceful handling of API failures
- Continues with available services if one fails
- Detailed error logging for troubleshooting
- Safe retry mechanisms for transient failures
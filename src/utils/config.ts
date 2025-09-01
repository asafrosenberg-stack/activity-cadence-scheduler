import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  // Google API
  google: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  
  // Notion API
  notion: {
    apiKey: string;
    databaseId: string;
    weeklySummaryDatabaseId?: string;
    logDatabaseId?: string;
  };
  
  // Gmail API
  gmail: {
    user: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  
  // Calendar IDs
  calendars: {
    primaryId: string;
    lmsId: string;
    outlookId: string;
  };
  
  // Application settings
  app: {
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
    workingDays: number[];
    bufferMinutes: number;
  };
  
  // Email settings
  email: {
    recipient: string;
  };
  
  // Cron settings
  cron: {
    schedule: string;
  };
}

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

function getOptionalEnvVar(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function loadConfig(): AppConfig {
  const config: AppConfig = {
    google: {
      clientId: getEnvVar('GOOGLE_CLIENT_ID'),
      clientSecret: getEnvVar('GOOGLE_CLIENT_SECRET'),
      refreshToken: getEnvVar('GOOGLE_REFRESH_TOKEN'),
    },
    
    notion: {
      apiKey: getEnvVar('NOTION_API_KEY'),
      databaseId: getEnvVar('NOTION_DATABASE_ID'),
    },
    
    gmail: {
      user: getEnvVar('GMAIL_USER'),
      clientId: getEnvVar('GMAIL_CLIENT_ID'),
      clientSecret: getEnvVar('GMAIL_CLIENT_SECRET'),
      refreshToken: getEnvVar('GMAIL_REFRESH_TOKEN'),
    },
    
    calendars: {
      primaryId: getEnvVar('GCAL_PRIMARY_ID'),
      lmsId: getEnvVar('GCAL_LMS_ID'),
      outlookId: getEnvVar('GCAL_OUTLOOK_ID'),
    },
    
    app: {
      timezone: getOptionalEnvVar('TIMEZONE', 'Europe/Amsterdam'),
      workingHours: {
        start: getOptionalEnvVar('WORKING_HOURS_START', '08:00'),
        end: getOptionalEnvVar('WORKING_HOURS_END', '21:00'),
      },
      workingDays: (getOptionalEnvVar('WORKING_DAYS', '1,2,3,4,5,6,7'))
        .split(',')
        .map(d => parseInt(d.trim())),
      bufferMinutes: parseInt(getOptionalEnvVar('BUFFER_MINUTES', '30')),
    },
    
    email: {
      recipient: getEnvVar('EMAIL_RECIPIENT'),
    },
    
    cron: {
      schedule: getOptionalEnvVar('CRON_SCHEDULE', '0 9 * * 1'), // Monday 09:00
    },
  };

  // Add optional database IDs if provided
  const logDatabaseId = process.env.NOTION_LOG_DATABASE_ID;
  if (logDatabaseId && logDatabaseId.trim()) {
    config.notion.logDatabaseId = logDatabaseId.trim();
  }

  const weeklySummaryDatabaseId = process.env.NOTION_WEEKLY_SUMMARY_DATABASE_ID;
  if (weeklySummaryDatabaseId && weeklySummaryDatabaseId.trim()) {
    config.notion.weeklySummaryDatabaseId = weeklySummaryDatabaseId.trim();
  }

  return config;
}
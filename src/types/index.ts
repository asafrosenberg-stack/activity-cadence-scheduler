// Core types for the activity scheduler

export interface ActivityPreference {
  id: string;
  session: string; // Tennis, Gym, Building, Writing
  times_a_week: number;
  duration_minutes: number;
  emoji: string;
}

export interface ScheduledActivity {
  id: string;
  session: string;
  emoji: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  sessionNumber: number; // 1, 2, 3 for multiple sessions per week
  calendarEventId?: string;
}

export interface SchedulerConfig {
  workingHours: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  workingDays: number[]; // 1-7, Monday to Sunday
  bufferMinutes: number; // minutes between activities
  timezone: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  busy: boolean;
  calendarId: string;
}

export interface WeeklySchedule {
  weekStart: Date;
  activities: ScheduledActivity[];
}

export interface NotionWeeklySummary {
  title: string;
  content: string;
  weekStart: Date;
}

export interface WeeklyScheduleSummary {
  title: string;
  weekStart: Date;
  weekEnd: Date;
  runType: 'scheduled' | 'manual' | 'test';
  totalActivities: number;
  activitiesByType: { [key: string]: number };
  scheduleDetails: ScheduledActivity[];
}

export interface EmailSummary {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface ScheduleRunLog {
  runId: string;
  timestamp: Date;
  runType: 'scheduled' | 'manual' | 'test';
  totalActivities: number;
  activitiesByType: { [key: string]: number };
  scheduleDetails: ScheduledActivity[];
  success: boolean;
  errors?: string[];
  duration?: number; // in milliseconds
}
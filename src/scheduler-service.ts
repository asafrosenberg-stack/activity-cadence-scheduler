import { NotionConnector } from './connectors/notion';
import { GoogleCalendarConnector } from './connectors/google-calendar';
import { GmailConnector } from './connectors/gmail';
import { ActivityScheduler } from './utils/scheduler';
import { ContentFormatter } from './utils/content-formatter';
import { DateHelpers } from './utils/date-helpers';
import { SchedulerConfig, ScheduledActivity, ScheduleRunLog, WeeklyScheduleSummary } from './types';
import { AppConfig } from './utils/config';

export class SchedulerService {
  private notion: NotionConnector;
  private calendar: GoogleCalendarConnector;
  private gmail: GmailConnector;
  private scheduler: ActivityScheduler;

  constructor(private config: AppConfig) {
    this.notion = new NotionConnector(config.notion.apiKey);
    
    this.calendar = new GoogleCalendarConnector(
      config.google.clientId,
      config.google.clientSecret,
      config.google.refreshToken
    );
    
    this.gmail = new GmailConnector(
      config.gmail.clientId,
      config.gmail.clientSecret,
      config.gmail.refreshToken,
      config.gmail.user
    );

    const schedulerConfig: SchedulerConfig = {
      workingHours: config.app.workingHours,
      workingDays: config.app.workingDays,
      bufferMinutes: config.app.bufferMinutes,
      timezone: config.app.timezone,
    };

    this.scheduler = new ActivityScheduler(schedulerConfig);
  }

  async runWeeklyScheduling(): Promise<void> {
    const startTime = Date.now();
    const runId = `run-${Date.now()}`;
    const runLog: ScheduleRunLog = {
      runId,
      timestamp: new Date(),
      runType: 'scheduled',
      totalActivities: 0,
      activitiesByType: {},
      scheduleDetails: [],
      success: false,
      errors: []
    };

    try {
      console.log('🚀 Starting weekly activity scheduling...');
      
      // Step 1: Get next week's date range
      const nextWeekStart = DateHelpers.getNextWeekStart();
      const nextWeekEnd = DateHelpers.getWeekEnd(nextWeekStart);
      
      console.log(`📅 Scheduling for week: ${DateHelpers.formatWeekTitle(nextWeekStart)}`);

      // Step 2: Fetch activity preferences from Notion
      console.log('📋 Fetching activity preferences from Notion...');
      const preferences = await this.notion.getActivityPreferences(this.config.notion.databaseId);
      console.log(`Found ${preferences.length} activity preferences`);

      // Step 3: Fetch busy times from all calendars
      console.log('📆 Fetching busy times from calendars...');
      const calendarIds = [
        this.config.calendars.primaryId,
        this.config.calendars.lmsId,
        this.config.calendars.outlookId,
      ];
      
      const busyEvents = await this.calendar.getBusyEvents(
        calendarIds,
        nextWeekStart,
        nextWeekEnd
      );
      console.log(`Found ${busyEvents.length} existing events`);

      // Step 4: Clear previous automated events from primary calendar
      console.log('🧹 Clearing previous automated events...');
      await this.calendar.clearPreviousWeekEvents(
        this.config.calendars.primaryId,
        nextWeekStart,
        nextWeekEnd
      );

      // Step 5: Generate optimal schedule
      console.log('🧠 Generating optimal schedule...');
      const scheduledActivities = await this.scheduler.scheduleActivities(
        preferences,
        busyEvents,
        nextWeekStart
      );
      
      console.log(`✅ Scheduled ${scheduledActivities.length} activities`);

      if (scheduledActivities.length === 0) {
        console.log('⚠️  No activities could be scheduled. Check your preferences and calendar conflicts.');
        return;
      }

      // Step 6: Create calendar events
      console.log('📅 Creating calendar events...');
      const eventIds = await this.calendar.createMultipleEvents(
        this.config.calendars.primaryId,
        scheduledActivities
      );
      console.log(`Created ${eventIds.length} calendar events`);

      // Step 7: Create Notion summary page (skip for now - needs weekly summary database)
      console.log('📝 Skipping Notion summary page (weekly summary database not configured)');
      ContentFormatter.createWeeklySummary(scheduledActivities, nextWeekStart);
      console.log('✅ Weekly summary content prepared');

      // Step 8: Send email summary (temporarily disabled - OAuth needs refresh)
      console.log('📧 Preparing email summary...');
      const emailSummary = ContentFormatter.createEmailSummary(scheduledActivities, nextWeekStart);
      console.log('📧 Email summary prepared (sending disabled - OAuth needs refresh)');
      console.log('💡 Email content preview:');
      console.log('📧 Subject:', emailSummary.subject);
      console.log('📧 Content:\n', emailSummary.textContent);
      
      // Keep gmail reference to avoid TypeScript warning
      if (this.gmail) {
        console.log('📧 Gmail connector ready (but disabled for OAuth refresh)');
      }

      // Step 9: Log final summary
      this.logSchedulingSummary(scheduledActivities, nextWeekStart);
      
      // Update run log with success data
      runLog.totalActivities = scheduledActivities.length;
      runLog.activitiesByType = scheduledActivities.reduce((acc, activity) => {
        acc[activity.session] = (acc[activity.session] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      runLog.scheduleDetails = scheduledActivities;
      runLog.success = true;
      runLog.duration = Date.now() - startTime;
      
      // Step 10: Log the run to Notion if logging database is configured
      await this.logRunToNotion(runLog);
      
      // Step 11: Create weekly schedule summary page
      await this.createWeeklyScheduleSummary(scheduledActivities, nextWeekStart, nextWeekEnd, 'scheduled');
      
      // Step 12: Send email summary
      await this.sendScheduleEmail(scheduledActivities, nextWeekStart, 'scheduled');
      
      console.log('🎉 Weekly scheduling completed successfully!');
      
    } catch (error) {
      console.error('❌ Error during weekly scheduling:', error);
      
      // Update run log with error data
      runLog.success = false;
      runLog.duration = Date.now() - startTime;
      runLog.errors = [error instanceof Error ? error.message : String(error)];
      
      // Log the failed run to Notion
      await this.logRunToNotion(runLog);
      
      throw error;
    }
  }

  private logSchedulingSummary(activities: ScheduledActivity[], _weekStart: Date): void {
    console.log('\n📊 Scheduling Summary:');
    console.log('='.repeat(50));
    
    const activitiesByType = activities.reduce((acc, activity) => {
      acc[activity.session] = (acc[activity.session] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [session, count] of Object.entries(activitiesByType)) {
      console.log(`${session}: ${count} session(s)`);
    }

    console.log('\n📅 Schedule:');
    console.log('-'.repeat(30));
    
    const sortedActivities = activities.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    for (const activity of sortedActivities) {
      const day = DateHelpers.getDayName(activity.startTime);
      const time = DateHelpers.formatTime(activity.startTime);
      console.log(`${day} ${time}: ${activity.emoji} ${activity.session} ${activity.sessionNumber}`);
    }
    
    console.log('='.repeat(50));
  }

  async testRun(): Promise<void> {
    console.log('🧪 Running test scheduling (without creating events)...');
    
    const startTime = Date.now();
    const runId = `test-run-${Date.now()}`;
    const runLog: ScheduleRunLog = {
      runId,
      timestamp: new Date(),
      runType: 'test',
      totalActivities: 0,
      activitiesByType: {},
      scheduleDetails: [],
      success: false,
      errors: []
    };

    try {
      const nextWeekStart = DateHelpers.getNextWeekStart();
      const nextWeekEnd = DateHelpers.getWeekEnd(nextWeekStart);
      
      const preferences = await this.notion.getActivityPreferences(this.config.notion.databaseId);
      const calendarIds = [
        this.config.calendars.primaryId,
        this.config.calendars.lmsId,
        this.config.calendars.outlookId,
      ];
      
      const busyEvents = await this.calendar.getBusyEvents(calendarIds, nextWeekStart, nextWeekEnd);
      const scheduledActivities = await this.scheduler.scheduleActivities(preferences, busyEvents, nextWeekStart);
      
      this.logSchedulingSummary(scheduledActivities, nextWeekStart);
      
      // Update run log with success data
      runLog.totalActivities = scheduledActivities.length;
      runLog.activitiesByType = scheduledActivities.reduce((acc, activity) => {
        acc[activity.session] = (acc[activity.session] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      runLog.scheduleDetails = scheduledActivities;
      runLog.success = true;
      runLog.duration = Date.now() - startTime;
      
      // Log the test run to Notion
      await this.logRunToNotion(runLog);
      
      // Create weekly schedule summary page for test run
      await this.createWeeklyScheduleSummary(scheduledActivities, nextWeekStart, nextWeekEnd, 'test');
      
      // Send email summary for test run
      await this.sendScheduleEmail(scheduledActivities, nextWeekStart, 'test');
      
      console.log('🧪 Test completed - no actual events created');
    } catch (error) {
      console.error('❌ Test run failed:', error);
      
      // Update run log with error data
      runLog.success = false;
      runLog.duration = Date.now() - startTime;
      runLog.errors = [error instanceof Error ? error.message : String(error)];
      
      // Log the failed test run to Notion
      await this.logRunToNotion(runLog);
      
      throw error;
    }
  }

  private async logRunToNotion(runLog: ScheduleRunLog): Promise<void> {
    try {
      if (this.config.notion.logDatabaseId) {
        console.log('📝 Logging run details to Notion...');
        await this.notion.logScheduleRun(this.config.notion.logDatabaseId, runLog);
        console.log('✅ Run logged to Notion successfully');
      } else {
        console.log('⚠️  Notion log database not configured - skipping run logging');
      }
    } catch (error) {
      console.error('❌ Failed to log run to Notion:', error);
      // Don't throw the error - logging failure shouldn't break the main process
    }
  }

  private async createWeeklyScheduleSummary(
    activities: ScheduledActivity[], 
    weekStart: Date, 
    weekEnd: Date, 
    runType: 'scheduled' | 'manual' | 'test'
  ): Promise<void> {
    try {
      if (this.config.notion.weeklySummaryDatabaseId) {
        console.log('📄 Creating weekly schedule summary page...');
        
        const activitiesByType = activities.reduce((acc, activity) => {
          acc[activity.session] = (acc[activity.session] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const summary: WeeklyScheduleSummary = {
          title: `Week ${weekStart.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })} - ${weekEnd.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })} Schedule`,
          weekStart,
          weekEnd,
          runType,
          totalActivities: activities.length,
          activitiesByType,
          scheduleDetails: activities,
        };

        await this.notion.createWeeklyScheduleSummary(this.config.notion.weeklySummaryDatabaseId, summary);
        console.log('✅ Weekly schedule summary page created');
      } else {
        console.log('⚠️  Weekly summary database not configured - skipping summary page creation');
      }
    } catch (error) {
      console.error('❌ Failed to create weekly schedule summary:', error);
      // Don't throw the error - summary creation failure shouldn't break the main process
    }
  }

  private async sendScheduleEmail(
    activities: ScheduledActivity[], 
    weekStart: Date, 
    runType: 'scheduled' | 'manual' | 'test'
  ): Promise<void> {
    try {
      console.log('📧 Sending schedule summary email...');
      
      const emailSummary = ContentFormatter.createScheduleSummaryEmail(activities, weekStart, runType);
      
      await this.gmail.sendScheduleSummary(
        this.config.email.recipient,
        emailSummary.subject,
        emailSummary.htmlContent,
        emailSummary.textContent
      );
      
      console.log('✅ Schedule summary email sent successfully');
    } catch (error) {
      console.error('❌ Failed to send schedule email:', error);
      // Don't throw the error - email failure shouldn't break the main process
    }
  }
}
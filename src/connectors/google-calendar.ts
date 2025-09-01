import { google } from 'googleapis';
import { CalendarEvent, ScheduledActivity } from '../types';

export class GoogleCalendarConnector {
  private calendar;

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async getBusyEvents(calendarIds: string[], startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const allEvents: CalendarEvent[] = [];

    for (const calendarId of calendarIds) {
      try {
        const response = await this.calendar.events.list({
          calendarId,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = response.data.items || [];
        
        for (const event of events) {
          if (event.start?.dateTime && event.end?.dateTime) {
            allEvents.push({
              id: event.id || '',
              summary: event.summary || '',
              start: new Date(event.start.dateTime),
              end: new Date(event.end.dateTime),
              busy: true,
              calendarId,
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching events from calendar ${calendarId}:`, error);
      }
    }

    return allEvents;
  }

  async createActivityEvent(calendarId: string, activity: ScheduledActivity): Promise<string> {
    const event = {
      summary: `${activity.emoji} ${activity.session} ${activity.sessionNumber}`,
      start: {
        dateTime: activity.startTime.toISOString(),
        timeZone: 'Europe/Amsterdam',
      },
      end: {
        dateTime: activity.endTime.toISOString(),
        timeZone: 'Europe/Amsterdam',
      },
      description: 'Auto-scheduled via automation',
    };

    const response = await this.calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return response.data.id || '';
  }

  async createMultipleEvents(calendarId: string, activities: ScheduledActivity[]): Promise<string[]> {
    const eventIds: string[] = [];

    for (const activity of activities) {
      try {
        const eventId = await this.createActivityEvent(calendarId, activity);
        eventIds.push(eventId);
        activity.calendarEventId = eventId;
      } catch (error) {
        console.error(`Error creating event for ${activity.session}:`, error);
      }
    }

    return eventIds;
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId,
      eventId,
    });
  }

  async clearPreviousWeekEvents(calendarId: string, startDate: Date, endDate: Date): Promise<void> {
    const response = await this.calendar.events.list({
      calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      q: 'Auto-scheduled via automation',
    });

    const events = response.data.items || [];
    
    for (const event of events) {
      if (event.id) {
        await this.deleteEvent(calendarId, event.id);
      }
    }
  }
}
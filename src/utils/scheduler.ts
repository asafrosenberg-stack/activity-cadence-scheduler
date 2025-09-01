import { ActivityPreference, ScheduledActivity, SchedulerConfig, CalendarEvent } from '../types';
import { DateHelpers } from './date-helpers';

export class ActivityScheduler {
  constructor(private config: SchedulerConfig) {}

  async scheduleActivities(
    preferences: ActivityPreference[],
    existingEvents: CalendarEvent[],
    weekStartDate: Date
  ): Promise<ScheduledActivity[]> {
    const scheduledActivities: ScheduledActivity[] = [];
    const weekDays = DateHelpers.getWorkingDays(weekStartDate, this.config.workingDays);
    
    // Expand preferences into individual sessions
    const sessions = this.expandPreferencesToSessions(preferences);
    
    // Sort sessions by priority and constraints
    const prioritizedSessions = this.prioritizeSessions(sessions);
    
    // Schedule each session
    for (const session of prioritizedSessions) {
      const timeSlot = this.findBestTimeSlot(
        session,
        weekDays,
        existingEvents,
        scheduledActivities
      );
      
      if (timeSlot) {
        const scheduledActivity: ScheduledActivity = {
          id: `${session.session}-${session.sessionNumber}`,
          session: session.session,
          emoji: session.emoji,
          startTime: timeSlot.start,
          endTime: timeSlot.end,
          duration: session.duration_minutes,
          sessionNumber: session.sessionNumber,
        };
        
        scheduledActivities.push(scheduledActivity);
        
        // Add as busy time for next iterations
        existingEvents.push({
          id: scheduledActivity.id,
          summary: `${scheduledActivity.emoji} ${scheduledActivity.session}`,
          start: scheduledActivity.startTime,
          end: scheduledActivity.endTime,
          busy: true,
          calendarId: 'scheduled',
        });
      }
    }
    
    return scheduledActivities;
  }

  private expandPreferencesToSessions(preferences: ActivityPreference[]): Array<ActivityPreference & { sessionNumber: number }> {
    const sessions: Array<ActivityPreference & { sessionNumber: number }> = [];
    
    for (const preference of preferences) {
      for (let i = 1; i <= preference.times_a_week; i++) {
        sessions.push({
          ...preference,
          sessionNumber: i,
        });
      }
    }
    
    return sessions;
  }

  private prioritizeSessions(sessions: Array<ActivityPreference & { sessionNumber: number }>): Array<ActivityPreference & { sessionNumber: number }> {
    return sessions.sort((a, b) => {
      // Writing has specific time preferences, schedule first
      if (a.session === 'Writing' && b.session !== 'Writing') return -1;
      if (b.session === 'Writing' && a.session !== 'Writing') return 1;
      
      // Tennis and Gym need spacing, schedule early
      if ((a.session === 'Tennis' || a.session === 'Gym') && 
          (b.session !== 'Tennis' && b.session !== 'Gym')) return -1;
      if ((b.session === 'Tennis' || b.session === 'Gym') && 
          (a.session !== 'Tennis' && a.session !== 'Gym')) return 1;
      
      return 0;
    });
  }

  private findBestTimeSlot(
    session: ActivityPreference & { sessionNumber: number },
    weekDays: Date[],
    existingEvents: CalendarEvent[],
    scheduledActivities: ScheduledActivity[]
  ): { start: Date; end: Date } | null {
    
    for (const day of weekDays) {
      // Apply session-specific rules
      if (!this.isDayValidForSession(session, day, scheduledActivities)) {
        continue;
      }
      
      const timeSlots = this.getPreferredTimeSlotsForSession(session);
      
      for (const timeSlot of timeSlots) {
        const slotStart = new Date(day);
        slotStart.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + session.duration_minutes);
        
        if (this.isTimeSlotAvailable(slotStart, slotEnd, existingEvents)) {
          return { start: slotStart, end: slotEnd };
        }
      }
      
      // If no preferred slots, try general business hours
      const generalSlots = this.generateTimeSlots(day, session.duration_minutes);
      for (const slot of generalSlots) {
        if (this.isTimeSlotAvailable(slot.start, slot.end, existingEvents)) {
          return slot;
        }
      }
    }
    
    return null;
  }

  private isDayValidForSession(
    session: ActivityPreference & { sessionNumber: number },
    day: Date,
    scheduledActivities: ScheduledActivity[]
  ): boolean {
    const dayActivities = scheduledActivities.filter(activity => 
      activity.startTime.toDateString() === day.toDateString()
    );
    
    // RULE: No activity type can be scheduled multiple times on the same day
    if (dayActivities.some(a => a.session === session.session)) {
      return false;
    }
    
    // Tennis and Gym cannot be on the same day
    if (session.session === 'Tennis') {
      if (dayActivities.some(a => a.session === 'Gym')) return false;
    }
    if (session.session === 'Gym') {
      if (dayActivities.some(a => a.session === 'Tennis')) return false;
    }
    
    // Writing: avoid days with Tennis or Gym
    if (session.session === 'Writing') {
      if (dayActivities.some(a => a.session === 'Tennis' || a.session === 'Gym')) return false;
    }
    
    // Coding: maximum 1 per day (now redundant with the general rule above, but keeping for clarity)
    if (session.session === 'Building' || session.session === 'Coding') {
      if (dayActivities.some(a => a.session === 'Building' || a.session === 'Coding')) return false;
    }
    
    // Tennis and Gym must have at least 1 full day gap between same type
    if (session.session === 'Tennis' || session.session === 'Gym') {
      const sameTypeActivities = scheduledActivities.filter(a => a.session === session.session);
      for (const activity of sameTypeActivities) {
        const daysDiff = Math.abs(day.getTime() - activity.startTime.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff < 2) return false; // Less than 2 days (need at least 1 full day gap)
      }
    }
    
    return true;
  }

  private getPreferredTimeSlotsForSession(
    session: ActivityPreference & { sessionNumber: number }
  ): Array<{ hour: number; minute: number }> {
    if (session.session === 'Writing') {
      // Prefer 08:00–10:00 or 16:00–18:00
      return [
        { hour: 8, minute: 0 },
        { hour: 8, minute: 30 },
        { hour: 9, minute: 0 },
        { hour: 16, minute: 0 },
        { hour: 16, minute: 30 },
        { hour: 17, minute: 0 },
      ];
    }
    
    return [];
  }

  private generateTimeSlots(day: Date, durationMinutes: number): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = [];
    const [startHour] = this.config.workingHours.start.split(':').map(Number);
    const [endHour] = this.config.workingHours.end.split(':').map(Number);
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(day);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);
        
        if (slotEnd.getHours() <= endHour) {
          slots.push({ start: slotStart, end: slotEnd });
        }
      }
    }
    
    return slots;
  }

  private isTimeSlotAvailable(
    slotStart: Date,
    slotEnd: Date,
    existingEvents: CalendarEvent[]
  ): boolean {
    // Add buffer time before and after
    const bufferedStart = new Date(slotStart);
    bufferedStart.setMinutes(bufferedStart.getMinutes() - this.config.bufferMinutes);
    
    const bufferedEnd = new Date(slotEnd);
    bufferedEnd.setMinutes(bufferedEnd.getMinutes() + this.config.bufferMinutes);
    
    return !existingEvents.some(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Check for any overlap with buffer
      return (bufferedStart < eventEnd && bufferedEnd > eventStart);
    });
  }
}
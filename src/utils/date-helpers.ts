import { startOfWeek, endOfWeek, addDays, isWithinInterval } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Europe/Amsterdam';

export class DateHelpers {
  static getWeekStart(date: Date = new Date()): Date {
    const zonedDate = utcToZonedTime(date, TIMEZONE);
    const weekStart = startOfWeek(zonedDate, { weekStartsOn: 1 }); // Monday
    return zonedTimeToUtc(weekStart, TIMEZONE);
  }

  static getWeekEnd(date: Date = new Date()): Date {
    const zonedDate = utcToZonedTime(date, TIMEZONE);
    const weekEnd = endOfWeek(zonedDate, { weekStartsOn: 1 }); // Sunday
    return zonedTimeToUtc(weekEnd, TIMEZONE);
  }

  static getNextWeekStart(date: Date = new Date()): Date {
    const weekStart = this.getWeekStart(date);
    return addDays(weekStart, 7);
  }

  static getWorkingDays(weekStart: Date, workingDays: number[]): Date[] {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      if (workingDays.includes(i + 1)) { // workingDays is 1-based (Monday=1)
        days.push(addDays(weekStart, i));
      }
    }
    return days;
  }

  static formatTime(date: Date, timezone: string = TIMEZONE): string {
    return formatInTimeZone(date, timezone, 'HH:mm');
  }

  static formatDate(date: Date, timezone: string = TIMEZONE): string {
    return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
  }

  static formatDateTime(date: Date, timezone: string = TIMEZONE): string {
    return formatInTimeZone(date, timezone, 'yyyy-MM-dd HH:mm');
  }

  static formatWeekTitle(weekStart: Date, timezone: string = TIMEZONE): string {
    return `Week of ${this.formatDate(weekStart, timezone)}`;
  }

  static createAmsterdamDate(year: number, month: number, day: number, hour: number = 0, minute: number = 0): Date {
    const localDate = new Date(year, month - 1, day, hour, minute);
    return zonedTimeToUtc(localDate, TIMEZONE);
  }

  static toAmsterdamTime(date: Date): Date {
    return utcToZonedTime(date, TIMEZONE);
  }

  static isTimeSlotAvailable(
    slotStart: Date,
    slotEnd: Date,
    existingEvents: { start: Date; end: Date }[]
  ): boolean {
    return !existingEvents.some(event =>
      isWithinInterval(slotStart, { start: event.start, end: event.end }) ||
      isWithinInterval(slotEnd, { start: event.start, end: event.end }) ||
      (slotStart <= event.start && slotEnd >= event.end)
    );
  }

  static getDayName(date: Date, timezone: string = TIMEZONE): string {
    return formatInTimeZone(date, timezone, 'EEEE');
  }
}
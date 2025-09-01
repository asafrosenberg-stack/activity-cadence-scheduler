import { ScheduledActivity, NotionWeeklySummary, EmailSummary } from '../types';
import { DateHelpers } from './date-helpers';

export class ContentFormatter {
  static createWeeklySummary(activities: ScheduledActivity[], weekStart: Date): NotionWeeklySummary {
    const title = DateHelpers.formatWeekTitle(weekStart);
    const content = this.formatWeeklyContent(activities, weekStart);
    
    return {
      title,
      content,
      weekStart,
    };
  }

  static createEmailSummary(activities: ScheduledActivity[], weekStart: Date): EmailSummary {
    const title = DateHelpers.formatWeekTitle(weekStart);
    const subject = `Activity Cadence - ${title}`;
    const content = this.formatWeeklyContent(activities, weekStart);
    
    const htmlContent = this.formatAsHtml(content);
    
    return {
      subject,
      htmlContent,
      textContent: content,
    };
  }

  private static formatWeeklyContent(activities: ScheduledActivity[], weekStart: Date): string {
    const title = DateHelpers.formatWeekTitle(weekStart);
    let content = `${title}\n\n`;
    
    // Group activities by day
    const activitiesByDay = this.groupActivitiesByDay(activities);
    
    // Generate content for each day
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      
      const dayName = DateHelpers.getDayName(day);
      const dayActivities = activitiesByDay.get(day.toDateString()) || [];
      
      content += `${dayName}:\n`;
      
      if (dayActivities.length === 0) {
        content += '  No scheduled activities\n';
      } else {
        dayActivities
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
          .forEach((activity, index) => {
            const startTime = DateHelpers.formatTime(activity.startTime);
            content += `  ${index + 1}. ${activity.emoji} ${activity.session} at ${startTime}\n`;
          });
      }
      
      content += '\n';
    }
    
    return content.trim();
  }

  private static groupActivitiesByDay(activities: ScheduledActivity[]): Map<string, ScheduledActivity[]> {
    const grouped = new Map<string, ScheduledActivity[]>();
    
    for (const activity of activities) {
      const dayKey = activity.startTime.toDateString();
      if (!grouped.has(dayKey)) {
        grouped.set(dayKey, []);
      }
      grouped.get(dayKey)!.push(activity);
    }
    
    return grouped;
  }

  private static formatAsHtml(textContent: string): string {
    let html = '<div style="font-family: Arial, sans-serif; line-height: 1.6;">';
    
    const lines = textContent.split('\n');
    let inList = false;
    
    for (const line of lines) {
      if (line.trim() === '') {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += '<br>';
      } else if (line.endsWith(':')) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<h3 style="color: #333; margin-top: 20px; margin-bottom: 10px;">${line}</h3>`;
      } else if (line.startsWith('  ')) {
        if (!inList) {
          html += '<ul style="margin-left: 20px;">';
          inList = true;
        }
        html += `<li>${line.trim()}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<h2 style="color: #2c3e50; margin-bottom: 15px;">${line}</h2>`;
      }
    }
    
    if (inList) {
      html += '</ul>';
    }
    
    html += '</div>';
    
    return html;
  }

  static createScheduleSummaryEmail(activities: ScheduledActivity[], weekStart: Date, runType: string): EmailSummary {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const subject = `📅 Weekly Schedule ${weekStart.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${weekEnd.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })}`;
    
    const textContent = this.formatScheduleForEmail(activities);
    const htmlContent = this.formatScheduleForEmailHtml(activities, weekStart, weekEnd, runType);
    
    return {
      subject,
      htmlContent,
      textContent,
    };
  }

  private static formatScheduleForEmail(activities: ScheduledActivity[]): string {
    if (!activities || activities.length === 0) {
      return 'No activities scheduled for this week.';
    }

    return activities
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .map(activity => {
        const day = activity.startTime.toLocaleDateString('en-US', { weekday: 'long' });
        const time = activity.startTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        return `${day} ${time}: ${activity.emoji} ${activity.session} ${activity.sessionNumber}`;
      })
      .join('\n');
  }

  private static formatScheduleForEmailHtml(activities: ScheduledActivity[], weekStart: Date, weekEnd: Date, runType: string): string {
    const scheduleText = this.formatScheduleForEmail(activities);
    
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">📅 Weekly Schedule</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 16px;">
            ${weekStart.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} - ${weekEnd.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p style="color: #95a5a6; margin: 5px 0 0 0; font-size: 14px; text-transform: capitalize;">
            ${runType} Run • ${activities.length} Activities
          </p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 25px; border-left: 4px solid #3498db;">
          <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 18px;">🗓️ This Week's Schedule</h2>
          <div style="font-family: 'Monaco', 'Consolas', monospace; font-size: 14px; line-height: 1.6; color: #2c3e50; white-space: pre-line;">
${scheduleText}
          </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center; padding: 20px; background: #ecf0f1; border-radius: 8px;">
          <p style="color: #7f8c8d; margin: 0; font-size: 14px;">
            🤖 Generated automatically by Activity Cadence Scheduler<br>
            <small>Keep crushing your goals! 💪</small>
          </p>
        </div>
      </div>
    `;
  }
}
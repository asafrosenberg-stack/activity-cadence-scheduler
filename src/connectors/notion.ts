import { Client } from '@notionhq/client';
import { ActivityPreference, NotionWeeklySummary, ScheduleRunLog, WeeklyScheduleSummary } from '../types';

export class NotionConnector {
  private notion: Client;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }

  async getActivityPreferences(databaseId: string): Promise<ActivityPreference[]> {
    const response = await this.notion.databases.query({
      database_id: databaseId,
    });

    return response.results.map((page: any) => {
      const properties = page.properties;
      
      // Handle different property names that might exist in the database
      const session = properties.Session?.title?.[0]?.text?.content || 
                     properties.session?.rich_text?.[0]?.text?.content || 
                     properties.session?.title?.[0]?.text?.content || '';
      
      const timesAWeek = properties['Times a week']?.number || 
                        properties.times_a_week?.number || 
                        properties['times_a_week']?.number || 0;
      
      const durationMinutes = properties['Duration (minutes)']?.number || 
                             properties.duration_minutes?.number || 
                             properties['duration_minutes']?.number || 0;
      
      const emoji = properties.emoji?.rich_text?.[0]?.text?.content || 
                   properties.Emoji?.rich_text?.[0]?.text?.content || 
                   this.getDefaultEmoji(session);

      return {
        id: page.id,
        session,
        times_a_week: timesAWeek,
        duration_minutes: durationMinutes,
        emoji,
      };
    });
  }

  private getDefaultEmoji(session: string): string {
    const session_lower = session.toLowerCase();
    if (session_lower.includes('tennis')) return '🎾';
    if (session_lower.includes('gym')) return '🏋️';
    if (session_lower.includes('building') || session_lower.includes('coding')) return '💻';
    if (session_lower.includes('writing')) return '📝';
    return '⚡'; // default
  }

  async createWeeklySummary(parentDatabaseId: string, summary: NotionWeeklySummary): Promise<string> {
    const response = await this.notion.pages.create({
      parent: {
        database_id: parentDatabaseId,
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: summary.title,
              },
            },
          ],
        },
        'Week Start': {
          date: {
            start: summary.weekStart.toISOString().split('T')[0],
          },
        },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: summary.content,
                },
              },
            ],
          },
        },
      ],
    });

    return response.id;
  }

  async findOrCreateWeeklySummaryDatabase(): Promise<string> {
    // For now, return a hardcoded database ID
    // In production, you might want to search for an existing database or create one
    throw new Error('Weekly Summary database ID needs to be configured');
  }

  async logScheduleRun(logDatabaseId: string, runLog: ScheduleRunLog): Promise<string> {
    const scheduleText = this.formatScheduleForNotion(runLog.scheduleDetails);
    const activitiesText = Object.entries(runLog.activitiesByType)
      .map(([activity, count]) => `${activity}: ${count} session(s)`)
      .join('\n');

    const response = await this.notion.pages.create({
      parent: {
        database_id: logDatabaseId,
      },
      properties: {
        'Run ID': {
          title: [
            {
              text: {
                content: `${runLog.runType} - ${runLog.timestamp.toISOString().split('T')[0]} ${runLog.timestamp.toTimeString().split(' ')[0]}`,
              },
            },
          ],
        },
        'Date': {
          date: {
            start: runLog.timestamp.toISOString(),
          },
        },
        'Select': {
          select: {
            name: runLog.runType,
          },
        },
        'Total Activities': {
          number: runLog.totalActivities,
        },
        'Success': {
          checkbox: runLog.success,
        },
        'Duration (ms)': {
          number: runLog.duration || 0,
        },
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: '📊 Activity Summary',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: activitiesText,
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: '📅 Detailed Schedule',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'code',
          code: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: scheduleText,
                },
              },
            ],
            language: 'plain text',
          },
        },
        ...(runLog.errors && runLog.errors.length > 0 ? [
          {
            object: 'block' as const,
            type: 'heading_2' as const,
            heading_2: {
              rich_text: [
                {
                  type: 'text' as const,
                  text: {
                    content: '❌ Errors',
                  },
                },
              ],
            },
          },
          {
            object: 'block' as const,
            type: 'paragraph' as const,
            paragraph: {
              rich_text: [
                {
                  type: 'text' as const,
                  text: {
                    content: runLog.errors.join('\n'),
                  },
                },
              ],
            },
          },
        ] : []),
      ],
    });

    return response.id;
  }

  private formatScheduleForNotion(activities: any[]): string {
    if (!activities || activities.length === 0) {
      return 'No activities scheduled';
    }

    return activities
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

  async createWeeklyScheduleSummary(summaryDatabaseId: string, summary: WeeklyScheduleSummary): Promise<string> {
    const response = await this.notion.pages.create({
      parent: {
        database_id: summaryDatabaseId,
      },
      properties: {
        'Name': {
          title: [
            {
              text: {
                content: summary.title,
              },
            },
          ],
        },
        'Week Start': {
          date: {
            start: summary.weekStart.toISOString().split('T')[0],
          },
        },
        'Week End': {
          date: {
            start: summary.weekEnd.toISOString().split('T')[0],
          },
        },
        'Run Type': {
          select: {
            name: summary.runType,
          },
        },
        'Total Activities': {
          number: summary.totalActivities,
        },
      },
      children: [
        {
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: `📅 Weekly Schedule Summary`,
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: `Week of ${summary.weekStart.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} - ${summary.weekEnd.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}`,
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: '📊 Activity Summary',
                },
              },
            ],
          },
        },
        ...this.createActivitySummaryBlocks(summary.activitiesByType),
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: '🗓️ Weekly Schedule',
                },
              },
            ],
          },
        },
        ...this.createScheduleBlocks(summary.scheduleDetails),
      ],
    });

    return response.id;
  }

  private createActivitySummaryBlocks(activitiesByType: { [key: string]: number }): any[] {
    return Object.entries(activitiesByType).map(([activity, count]) => ({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          {
            type: 'text' as const,
            text: {
              content: `${activity}: ${count} session${count > 1 ? 's' : ''}`,
            },
          },
        ],
      },
    }));
  }

  private createScheduleBlocks(activities: any[]): any[] {
    if (!activities || activities.length === 0) {
      return [{
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text' as const,
              text: {
                content: 'No activities scheduled for this week.',
              },
            },
          ],
        },
      }];
    }

    // Group activities by day
    const activitiesByDay = activities.reduce((acc, activity) => {
      const day = activity.startTime.toLocaleDateString('en-US', { weekday: 'long' });
      if (!acc[day]) acc[day] = [];
      acc[day].push(activity);
      return acc;
    }, {});

    const blocks: any[] = [];

    // Create a block for each day
    Object.entries(activitiesByDay).forEach(([day, dayActivities]: [string, any]) => {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [
            {
              type: 'text' as const,
              text: {
                content: day,
              },
            },
          ],
        },
      });

      // Sort activities by time for each day
      const sortedActivities = (dayActivities as any[]).sort((a, b) => 
        a.startTime.getTime() - b.startTime.getTime()
      );

      sortedActivities.forEach(activity => {
        const time = activity.startTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: `${time} - ${activity.emoji} ${activity.session} ${activity.sessionNumber}`,
                },
              },
            ],
          },
        });
      });
    });

    return blocks;
  }
}
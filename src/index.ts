import dotenv from 'dotenv';
import cron from 'node-cron';
import { SchedulerService } from './scheduler-service';
import { loadConfig } from './utils/config';
import { createServer } from 'http';

dotenv.config();

async function main() {
  console.log('🚀 Activity Cadence Scheduler starting...');
  
  try {
    const config = loadConfig();
    const schedulerService = new SchedulerService(config);

    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--test')) {
      console.log('🧪 Running in test mode...');
      await schedulerService.testRun();
      process.exit(0);
    }
    
    if (args.includes('--run-now')) {
      console.log('⚡ Running scheduling immediately...');
      await schedulerService.runWeeklyScheduling();
      process.exit(0);
    }

    // Set up cron job for Monday 09:00 Amsterdam time
    console.log(`⏰ Scheduling cron job: ${config.cron.schedule} (${config.app.timezone})`);
    
    cron.schedule(config.cron.schedule, async () => {
      console.log('⏰ Cron triggered - starting weekly scheduling...');
      try {
        await schedulerService.runWeeklyScheduling();
      } catch (error) {
        console.error('❌ Scheduled run failed:', error);
      }
    }, {
      scheduled: true,
      timezone: config.app.timezone,
    });

    console.log('✅ Activity Cadence Scheduler is running!');
    console.log('📅 Next run will be on Monday at 09:00 Amsterdam time');
    console.log('💡 Use --test to run a test, or --run-now to execute immediately');
    
    // Create a simple HTTP server for Render health checks
    const port = process.env.PORT || 3000;
    const server = createServer((req, res) => {
      if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy', 
          service: 'Activity Cadence Scheduler',
          nextRun: 'Monday 09:00 Amsterdam time',
          version: '1.0.0'
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });
    
    server.listen(port, () => {
      console.log(`🌐 Health check server running on port ${port}`);
    });
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down Activity Cadence Scheduler...');
      server.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start Activity Cadence Scheduler:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };
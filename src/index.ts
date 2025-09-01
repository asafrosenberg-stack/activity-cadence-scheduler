import dotenv from 'dotenv';
import cron from 'node-cron';
import { SchedulerService } from './scheduler-service';
import { loadConfig } from './utils/config';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';

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
    
    // Create HTTP server with dashboard and API endpoints
    const port = process.env.PORT || 3000;
    const server = createServer(async (req, res) => {
      const url = req.url || '';
      const method = req.method || 'GET';
      
      try {
        // Dashboard route
        if (url === '/') {
          const dashboardPath = join(__dirname, 'views', 'dashboard.html');
          const dashboardHtml = readFileSync(dashboardPath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(dashboardHtml);
          return;
        }
        
        // Health check route
        if (url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'healthy', 
            service: 'Activity Cadence Scheduler',
            nextRun: 'Monday 09:00 Amsterdam time',
            version: '1.0.0'
          }));
          return;
        }
        
        // API: Test run
        if (url === '/api/test' && method === 'POST') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          try {
            console.log('🧪 Dashboard triggered test run');
            const result = await schedulerService.testRun();
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Test completed successfully. Check console logs for details.'
            }));
          } catch (error) {
            res.end(JSON.stringify({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error'
            }));
          }
          return;
        }
        
        // API: Full run
        if (url === '/api/run' && method === 'POST') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          try {
            console.log('⚡ Dashboard triggered full run');
            const result = await schedulerService.runWeeklyScheduling();
            res.end(JSON.stringify({ 
              success: true, 
              count: result?.length || 0,
              message: 'Weekly scheduling completed successfully'
            }));
          } catch (error) {
            res.end(JSON.stringify({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error'
            }));
          }
          return;
        }
        
        // API: Logs (basic endpoint)
        if (url === '/logs') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Scheduler Logs</title>
              <style>
                body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #fff; }
                .container { max-width: 1200px; margin: 0 auto; }
                .back-btn { 
                  display: inline-block; 
                  padding: 10px 20px; 
                  background: #007bff; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  margin-bottom: 20px; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <a href="/" class="back-btn">← Back to Dashboard</a>
                <h1>📋 Scheduler Logs</h1>
                <p>For detailed logs, check:</p>
                <ul>
                  <li>Your Render dashboard logs</li>
                  <li>Notion database: <a href="https://notion.so" target="_blank" style="color: #4fc3f7;">Open Notion</a></li>
                  <li>Email summaries sent to ${config.email.recipient}</li>
                </ul>
                <p>Future versions will include real-time log streaming here.</p>
              </div>
            </body>
            </html>
          `);
          return;
        }
        
        // 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        
      } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
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
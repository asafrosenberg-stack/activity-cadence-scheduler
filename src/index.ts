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
          try {
            // Try multiple possible paths for the HTML file
            let dashboardHtml: string;
            const possiblePaths = [
              join(__dirname, 'views', 'dashboard.html'),
              join(__dirname, '..', 'src', 'views', 'dashboard.html'),
              join(process.cwd(), 'src', 'views', 'dashboard.html'),
              join(process.cwd(), 'dist', 'views', 'dashboard.html')
            ];
            
            let found = false;
            for (const path of possiblePaths) {
              try {
                dashboardHtml = readFileSync(path, 'utf8');
                found = true;
                break;
              } catch (e) {
                // Continue to next path
              }
            }
            
            if (!found) {
              // Fallback: inline HTML dashboard
              dashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activity Cadence Scheduler - Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; padding: 20px;
        }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden; }
        .header { background: #2c3e50; color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .dashboard { padding: 40px; }
        .status-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px; border-left: 4px solid #28a745; }
        .button-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .btn { padding: 20px; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .result { margin-top: 20px; padding: 15px; border-radius: 8px; display: none; }
        .result.success { background: #d4edda; color: #155724; }
        .result.error { background: #f8d7da; color: #721c24; }
        .loading-spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid #ffffff; border-radius: 50%; border-top-color: transparent; animation: spin 1s ease-in-out infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Activity Cadence Scheduler</h1>
            <p>Manage your weekly activity scheduling</p>
        </div>
        <div class="dashboard">
            <div class="status-card">
                <h3>✅ Scheduler Status: Active</h3>
                <p>Next automated run: <strong>Monday at 09:00 Amsterdam time</strong></p>
            </div>
            <div class="button-grid">
                <button class="btn btn-primary" onclick="testRun()">🧪 Test Run</button>
                <button class="btn btn-success" onclick="runNow()">⚡ Run Now</button>
            </div>
            <div id="result" class="result"></div>
        </div>
    </div>
    <script>
        function showResult(message, type) {
            const result = document.getElementById('result');
            result.className = \`result \${type}\`;
            result.innerHTML = message;
            result.style.display = 'block';
        }
        async function testRun() {
            const button = event.target;
            button.disabled = true;
            button.innerHTML = '<span class="loading-spinner"></span> Running Test...';
            showResult('🧪 Starting test run...', 'loading');
            try {
                const response = await fetch('/api/test', { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                    showResult('✅ Test completed successfully!', 'success');
                } else {
                    showResult(\`❌ Test failed: \${result.error}\`, 'error');
                }
            } catch (error) {
                showResult(\`❌ Error: \${error.message}\`, 'error');
            }
            button.disabled = false;
            button.innerHTML = '🧪 Test Run';
        }
        async function runNow() {
            if (!confirm('This will schedule activities for next week. Continue?')) return;
            const button = event.target;
            button.disabled = true;
            button.innerHTML = '<span class="loading-spinner"></span> Scheduling...';
            showResult('⚡ Starting weekly scheduling...', 'loading');
            try {
                const response = await fetch('/api/run', { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                    showResult(\`✅ Scheduling completed! Scheduled \${result.count} activities\`, 'success');
                } else {
                    showResult(\`❌ Scheduling failed: \${result.error}\`, 'error');
                }
            } catch (error) {
                showResult(\`❌ Error: \${error.message}\`, 'error');
            }
            button.disabled = false;
            button.innerHTML = '⚡ Run Now';
        }
    </script>
</body>
</html>`;
            }
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(dashboardHtml);
            return;
          } catch (error) {
            console.error('Dashboard error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to load dashboard' }));
            return;
          }
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
            await schedulerService.testRun();
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
              count: Array.isArray(result) ? result.length : 0,
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
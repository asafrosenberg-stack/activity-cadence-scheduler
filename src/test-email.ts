import dotenv from 'dotenv';
import { GmailConnector } from './connectors/gmail';
import { loadConfig } from './utils/config';

dotenv.config();

async function testEmail() {
  console.log('📧 Testing Gmail functionality...');
  
  try {
    const config = loadConfig();
    const gmail = new GmailConnector(
      config.gmail.clientId,
      config.gmail.clientSecret,
      config.gmail.refreshToken,
      config.gmail.user
    );
    
    const testEmail = {
      subject: 'Activity Cadence Test - Email Working!',
      htmlContent: '<h1>🎉 Success!</h1><p>Gmail integration is working correctly.</p>',
      textContent: 'Success! Gmail integration is working correctly.',
    };
    
    console.log('Sending test email...');
    await gmail.sendWeeklySummary(config.email.recipient, testEmail);
    console.log('✅ Test email sent successfully!');
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

testEmail();
import dotenv from 'dotenv';
import { NotionConnector } from './connectors/notion';
import { DateHelpers } from './utils/date-helpers';
import { loadConfig } from './utils/config';

dotenv.config();

async function debugTest() {
  console.log('🔍 Debug Test - Checking Notion Data...');
  
  try {
    const config = loadConfig();
    const notion = new NotionConnector(config.notion.apiKey);
    
    // Test Notion connection
    console.log('📋 Fetching activities from Notion...');
    const preferences = await notion.getActivityPreferences(config.notion.databaseId);
    
    // Let's also check the raw Notion response to see actual property names
    console.log('\n🔍 Raw Notion response (first page):');
    
    // Let's also get the raw database response
    const rawResponse = await (notion as any).notion.databases.query({
      database_id: config.notion.databaseId,
    });
    
    if (rawResponse.results.length > 0) {
      console.log('Available properties in first page:');
      console.log(Object.keys(rawResponse.results[0].properties));
      console.log('\nFirst page properties detail:');
      console.log(JSON.stringify(rawResponse.results[0].properties, null, 2));
    }
    
    console.log(`\nParsed ${preferences.length} activities:`);
    preferences.forEach((pref, index) => {
      console.log(`  ${index + 1}. ${pref.emoji || '❓'} ${pref.session} - ${pref.times_a_week}x/week, ${pref.duration_minutes}min`);
    });
    
    // Test date calculations
    console.log('\n📅 Date calculations:');
    const nextWeekStart = DateHelpers.getNextWeekStart();
    const nextWeekEnd = DateHelpers.getWeekEnd(nextWeekStart);
    console.log(`Next week: ${DateHelpers.formatDate(nextWeekStart)} to ${DateHelpers.formatDate(nextWeekEnd)}`);
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

debugTest();
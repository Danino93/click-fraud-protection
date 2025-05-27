const https = require('https');

const testData = JSON.stringify({
  user_agent: "Mozilla/5.0 Test",
  referrer: "",
  page: "/test",
  gclid: null,
  time_on_page: 5,
  visit_start: "2025-01-27T12:00:00.000Z",
  event_type: "pageview",
  additional_data: {
    screen_width: 1920,
    screen_height: 1080,
    language: "he",
    platform: "Win32",
    timezone: "Asia/Jerusalem",
    url: "https://test.com/test",
    title: "Test Page",
    session_id: "test_session",
    scroll_depth: 50,
    mouse_movements: 10,
    user_interactions: []
  }
});

const options = {
  hostname: 'click-fraud-backend.vercel.app',
  port: 443,
  path: '/api/track',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('🧪 בודק שרת וורסל...');

const req = https.request(options, (res) => {
  console.log(`📊 סטטוס: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📨 תגובה מהשרת:');
    console.log(data);
  });
});

req.on('error', (e) => {
  console.error('❌ שגיאה:', e.message);
});

req.write(testData);
req.end(); 
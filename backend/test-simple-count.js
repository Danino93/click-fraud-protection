// בדיקה פשוטה של ספירת קליקים
const https = require('https');

function quickAPICall(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'click-fraud-backend.vercel.app',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Quick-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function quickTest() {
  console.log('⚡ בדיקה מהירה של שרת וורסל...\n');
  
  try {
    // נסיון לקבל stats פשוטים
    console.log('1️⃣ מנסה לקבל סטטיסטיקות...');
    const stats = await quickAPICall('/api/stats');
    console.log(`   סטטוס: ${stats.status}`);
    console.log(`   תוצאה:`, stats.data);
    
    // נסיון לקבל dashboard data
    console.log('\n2️⃣ מנסה לקבל נתוני דשבורד...');
    const dashboard = await quickAPICall('/api/dashboard');
    console.log(`   סטטוס: ${dashboard.status}`);
    console.log(`   תוצאה:`, dashboard.data);
    
    // שליחת עוד קליק לבדיקה
    console.log('\n3️⃣ שולח קליק נוסף...');
    const testClick = await makeTestClick();
    console.log(`   סטטוס: ${testClick.status}`);
    console.log(`   תוצאה:`, testClick.data);
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }
}

function makeTestClick() {
  return new Promise((resolve, reject) => {
    const testData = {
      user_agent: 'Mozilla/5.0 (Quick Test)',
      referrer: '',
      page: '/quick-test',
      gclid: null,
      time_on_page: 3,
      visit_start: new Date().toISOString(),
      event_type: 'pageview',
      additional_data: {
        quick_test: true,
        timestamp: Date.now()
      }
    };

    const options = {
      hostname: 'click-fraud-backend.vercel.app',
      port: 443,
      path: '/api/track',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.write(JSON.stringify(testData));
    req.end();
  });
}

quickTest(); 
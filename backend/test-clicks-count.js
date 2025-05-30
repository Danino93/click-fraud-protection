// בדיקת מספר קליקים אמיתי ללא מגבלות
const https = require('https');

function makeAPIRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'click-fraud-backend.vercel.app',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Clicks-Counter/1.0',
        ...headers
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

async function testClicksCount() {
  console.log('🔢 בודק מספר קליקים אמיתי ללא מגבלות...\n');
  
  try {
    // נסיון גישה ללא token (אם זה נתיב ציבורי)
    console.log('1️⃣ מנסה לקבל קליקים ללא אימות...');
    const publicResult = await makeAPIRequest('/api/clicks?type=all');
    console.log(`   סטטוס: ${publicResult.status}`);
    
    if (publicResult.status === 401) {
      console.log('   🔒 נדרש אימות - נתיב מוגן');
    } else if (publicResult.status === 200 && Array.isArray(publicResult.data)) {
      const clicks = publicResult.data;
      console.log(`   ✅ התקבלו ${clicks.length} קליקים בלי מגבלה!`);
      
      const paidClicks = clicks.filter(c => c.is_paid).length;
      const organicClicks = clicks.filter(c => !c.is_paid).length;
      
      console.log(`   📊 פילוח:`);
      console.log(`      - ממומנים: ${paidClicks}`);
      console.log(`      - אורגניים: ${organicClicks}`);
      console.log(`      - סך הכל: ${clicks.length}`);
      
      if (clicks.length > 0) {
        const latestClick = clicks[0];
        const clickTime = new Date(latestClick.created_at);
        const minutesAgo = Math.round((Date.now() - clickTime.getTime()) / (1000 * 60));
        
        console.log(`   📅 קליק אחרון: לפני ${minutesAgo} דקות`);
        console.log(`      IP: ${latestClick.ip_address}`);
        console.log(`      סוג: ${latestClick.is_paid ? 'ממומן' : 'אורגני'}`);
        console.log(`      עמוד: ${latestClick.page}`);
      }
    } else {
      console.log(`   ❌ תגובה לא צפויה: ${publicResult.status}`);
      console.log('   ', publicResult.data);
    }
    
    // שליחת קליק נוסף כדי לוודא שהמערכת עדיין עובדת
    console.log('\n2️⃣ שולח קליק בדיקה...');
    const testResult = await sendTestClick();
    console.log(`   סטטוס: ${testResult.status}`);
    console.log(`   תגובה:`, testResult.data);
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }
}

function sendTestClick() {
  return new Promise((resolve, reject) => {
    const testData = {
      user_agent: 'Mozilla/5.0 (Count Test)',
      referrer: '',
      page: '/count-test',
      gclid: null, // אורגני
      time_on_page: 3,
      visit_start: new Date().toISOString(),
      event_type: 'pageview',
      additional_data: {
        count_test: true,
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

testClicksCount(); 
// בדיקת ספירה אמיתית דרך API של וורסל
const https = require('https');

function makeAPIRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'click-fraud-backend.vercel.app',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Click-Fraud-Counter/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testClickCounting() {
  console.log('🔍 בודק ספירת קליקים בשרת וורסל...\n');
  
  try {
    // בדיקת סטטוס השרת
    console.log('1️⃣ בודק סטטוס השרת...');
    const healthCheck = await makeAPIRequest('/api/health');
    console.log(`   סטטוס: ${healthCheck.status}`);
    console.log(`   תגובה:`, healthCheck.data);
    
    // שליחת קליק בדיקה
    console.log('\n2️⃣ שולח קליק בדיקה...');
    const testClick = {
      user_agent: 'Mozilla/5.0 (Test)',
      referrer: '',
      page: '/test-count',
      gclid: null, // קליק אורגני
      time_on_page: 5,
      visit_start: new Date().toISOString(),
      event_type: 'pageview',
      additional_data: {
        test: true,
        timestamp: Date.now(),
        source: 'count-test'
      }
    };
    
    const trackResponse = await makeAPIRequest('/api/track', 'POST', testClick);
    console.log(`   סטטוס שליחה: ${trackResponse.status}`);
    console.log(`   תגובת שרת:`, trackResponse.data);
    
    // בדיקת קליקים אחרונים (מוגבל ל-100)
    console.log('\n3️⃣ קובע קליקים אחרונים (מוגבל ל-100)...');
    const recentClicks = await makeAPIRequest('/api/clicks?type=all');
    console.log(`   סטטוס: ${recentClicks.status}`);
    
    if (recentClicks.status === 200 && Array.isArray(recentClicks.data)) {
      const clicks = recentClicks.data;
      console.log(`   מספר קליקים שהתקבלו: ${clicks.length}`);
      
      if (clicks.length > 0) {
        const paidClicks = clicks.filter(c => c.is_paid).length;
        const organicClicks = clicks.filter(c => !c.is_paid).length;
        
        console.log(`   📊 פילוח מתוך ה-${clicks.length} קליקים שהתקבלו:`);
        console.log(`      - ממומנים: ${paidClicks}`);
        console.log(`      - אורגניים: ${organicClicks}`);
        
        // הקליק האחרון
        const latestClick = clicks[0];
        const clickTime = new Date(latestClick.created_at);
        const minutesAgo = Math.round((Date.now() - clickTime.getTime()) / (1000 * 60));
        
        console.log(`   📅 הקליק האחרון: לפני ${minutesAgo} דקות`);
        console.log(`      IP: ${latestClick.ip_address}`);
        console.log(`      סוג: ${latestClick.is_paid ? 'ממומן' : 'אורגני'}`);
        console.log(`      עמוד: ${latestClick.page}`);
        
        if (clicks.length === 100) {
          console.log('\n⚠️  התקבלו בדיוק 100 קליקים - ייתכן שיש יותר במסד הנתונים!');
          console.log('   🔍 המגבלה של 100 ברקורדים עלולה להסתיר קליקים נוספים.');
        } else {
          console.log(`\n✅ התקבלו ${clicks.length} קליקים (פחות מ-100) - זוהי כנראה הספירה המלאה.`);
        }
      } else {
        console.log('   ❌ לא נמצאו קליקים במסד הנתונים!');
      }
    } else {
      console.log(`   ❌ שגיאה בקבלת קליקים: ${recentClicks.status}`);
      console.log('   תגובה:', recentClicks.data);
    }
    
  } catch (error) {
    console.error('❌ שגיאה בבדיקה:', error.message);
  }
}

// הרצה
testClickCounting(); 
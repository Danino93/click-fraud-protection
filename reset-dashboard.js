// סקריפט איפוס דשבורד - קורא לשרת וורסל ישירות
const https = require('https');

function makeAPIRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'click-fraud-backend.vercel.app',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dashboard-Reset/1.0',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function resetDashboard() {
  console.log('🗑️ מנסה לאפס דשבורד...\n');
  
  try {
    // נסיון איפוס ללא אימות
    console.log('1️⃣ מנסה איפוס ללא אימות...');
    const resetResult = await makeAPIRequest('/api/reset-dashboard', 'POST');
    console.log(`   סטטוס: ${resetResult.status}`);
    
    if (resetResult.status === 401) {
      console.log('   🔒 נדרש אימות לאיפוס');
      console.log('   💡 תצטרך להיכנס לדשבורד באתר ולאפס שם');
      console.log('   🌐 כתובת: https://click-fraud-backend.vercel.app/');
    } else if (resetResult.status === 200) {
      console.log('   ✅ איפוס הצליח!');
      console.log('   ', resetResult.data);
    } else {
      console.log('   ❌ תגובה לא צפויה:', resetResult.data);
    }
    
    // בואו נשלח כמה קליקים חדשים לבדיקה
    console.log('\n2️⃣ שולח 3 קליקים חדשים לבדיקה...');
    
    for (let i = 1; i <= 3; i++) {
      const testClick = {
        user_agent: `Mozilla/5.0 (Test ${i})`,
        referrer: '',
        page: `/reset-test-${i}`,
        gclid: i === 2 ? 'test_gclid_123' : null, // אחד ממומן, שניים אורגניים
        time_on_page: i * 2,
        visit_start: new Date().toISOString(),
        event_type: 'pageview',
        additional_data: {
          reset_test: true,
          click_number: i,
          timestamp: Date.now()
        }
      };
      
      const result = await makeAPIRequest('/api/track', 'POST', testClick);
      console.log(`   קליק ${i}: status ${result.status}, suspicious: ${result.data?.suspicious}`);
      
      // השהייה קצרה בין הקליקים
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ סיום! עכשיו תוכל לבדוק בדשבורד אם יש ספירה חדשה.');
    console.log('🌐 דשבורד: https://click-fraud-backend.vercel.app/');
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }
}

// הרצה
resetDashboard(); 
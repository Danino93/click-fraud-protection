// פשוט - בדיקת מסד נתונים
const https = require('https');

const supabaseUrl = 'https://ysqbyhaqtqeqjmwhsaht.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcWJ5aGFxdHFlcWptd2hzYWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NzAzNjQsImV4cCI6MjA0ODA0NjM2NH0.LJBC4LQMPxGSdKEQiWYDNsOPCWq0MjZo6cPFwBQxnpQ';

function makeRequest(path, callback) {
  const options = {
    hostname: 'ysqbyhaqtqeqjmwhsaht.supabase.co',
    port: 443,
    path: `/rest/v1/${path}`,
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        callback(null, jsonData);
      } catch (e) {
        callback(e, null);
      }
    });
  });
  
  req.on('error', (e) => {
    callback(e, null);
  });
  
  req.end();
}

console.log('🔍 בודק מסד נתונים...');

// בדיקת 10 קליקים אחרונים
makeRequest('clicks?select=*&order=created_at.desc&limit=10', (error, data) => {
  if (error) {
    console.error('❌ שגיאה בבדיקת קליקים:', error.message);
    return;
  }
  
  console.log(`\n📊 נמצאו ${data.length} קליקים אחרונים:`);
  console.log('=====================================');
  
  if (data.length === 0) {
    console.log('❌ אין קליקים במסד הנתונים!');
  } else {
    data.forEach((click, index) => {
      const createdAt = new Date(click.created_at).toLocaleString('he-IL');
      const clickType = click.is_paid ? 'ממומן' : 'אורגני';
      const gclid = click.gclid || 'ללא';
      console.log(`${index + 1}. ${createdAt} | ${clickType} | IP: ${click.ip_address} | Page: ${click.page}`);
    });
  }
  
  // ספירה כללית
  makeRequest('clicks?select=id', (countError, countData) => {
    if (countError) {
      console.error('❌ שגיאה בספירה:', countError.message);
      return;
    }
    
    console.log(`\n📈 סה"כ קליקים במסד הנתונים: ${countData.length}`);
    
    // ספירה לפי סוג
    const paidClicks = data.filter(c => c.is_paid).length;
    const organicClicks = data.filter(c => !c.is_paid).length;
    
    console.log(`📊 מתוך ה-10 האחרונים:`);
    console.log(`   - ממומנים: ${paidClicks}`);
    console.log(`   - אורגניים: ${organicClicks}`);
    
    if (countData.length === 0) {
      console.log('\n❌ הבעיה: אין קליקים כלל במסד הנתונים!');
      console.log('💡 נדרש לבדוק מדוע הקוד לא שולח נתונים.');
    } else {
      console.log(`\n✅ יש ${countData.length} קליקים במסד הנתונים!`);
      
      if (data.length > 0) {
        const latestClick = new Date(data[0].created_at);
        const timeDiff = Date.now() - latestClick.getTime();
        const minutesAgo = Math.round(timeDiff / (1000 * 60));
        
        console.log(`📅 הקליק האחרון: לפני ${minutesAgo} דקות`);
        
        if (minutesAgo > 5) {
          console.log('⚠️ הקליק האחרון ישן - ייתכן שהמערכת לא עובדת כרגע');
        } else {
          console.log('🟢 המערכת פעילה - יש קליקים חדשים!');
        }
      }
    }
  });
}); 
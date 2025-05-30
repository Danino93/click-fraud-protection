const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ysqbyhaqtqeqjmwhsaht.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcWJ5aGFxdHFlcWptd2hzYWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NzAzNjQsImV4cCI6MjA0ODA0NjM2NH0.LJBC4LQMPxGSdKEQiWYDNsOPCWq0MjZo6cPFwBQxnpQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentClicks() {
  try {
    console.log('🔍 בודק קליקים במסד הנתונים...\n');
    
    // קליקים אחרונים
    const { data: recentClicks, error: recentError } = await supabase
      .from('clicks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentError) throw recentError;
    
    console.log('📊 10 הקליקים האחרונים:');
    console.log('===================================');
    
    if (recentClicks.length === 0) {
      console.log('❌ אין קליקים במסד הנתונים!');
    } else {
      recentClicks.forEach((click, index) => {
        const createdAt = new Date(click.created_at).toLocaleString('he-IL');
        const clickType = click.is_paid ? 'ממומן' : 'אורגני';
        const gclid = click.gclid || 'ללא';
        console.log(`${index + 1}. ${createdAt} | ${clickType} | IP: ${click.ip_address} | Page: ${click.page} | GCLID: ${gclid}`);
      });
    }
    
    // סיכום כללי
    const { data: totalData, error: totalError } = await supabase
      .from('clicks')
      .select('is_paid, created_at');
    
    if (totalError) throw totalError;
    
    console.log('\n📈 סיכום כללי:');
    console.log('================');
    const totalClicks = totalData.length;
    const paidClicks = totalData.filter(c => c.is_paid).length;
    const organicClicks = totalData.filter(c => !c.is_paid).length;
    
    console.log(`סך הכל קליקים: ${totalClicks}`);
    console.log(`קליקים ממומנים: ${paidClicks}`);
    console.log(`קליקים אורגניים: ${organicClicks}`);
    
    // קליקים מהיום
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayClicks = totalData.filter(c => new Date(c.created_at) >= today);
    
    console.log(`\nקליקים מהיום: ${todayClicks.length}`);
    
    // קליקים מהשעה האחרונה
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentHourClicks = totalData.filter(c => new Date(c.created_at) >= oneHourAgo);
    
    console.log(`קליקים מהשעה האחרונה: ${recentHourClicks.length}`);
    
    if (totalClicks === 0) {
      console.log('\n❌ הבעיה: אין קליקים כלל במסד הנתונים!');
      console.log('💡 בדוק שהקוד מוטמע באתר ושולח נתונים לשרת.');
    } else if (recentHourClicks.length === 0) {
      console.log('\n⚠️ הבעיה: אין קליקים חדשים מהשעה האחרונה.');
      console.log('💡 בדוק שהקוד עדיין פעיל באתר.');
    } else {
      console.log('\n✅ יש קליקים חדשים - המערכת עובדת!');
    }
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }
}

checkRecentClicks(); 
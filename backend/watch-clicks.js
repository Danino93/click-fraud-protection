const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ysqbyhaqtqeqjmwhsaht.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcWJ5aGFxdHFlcWptd2hzYWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NzAzNjQsImV4cCI6MjA0ODA0NjM2NH0.LJBC4LQMPxGSdKEQiWYDNsOPCWq0MjZo6cPFwBQxnpQ';

const supabase = createClient(supabaseUrl, supabaseKey);

let lastCheckTime = new Date();
let totalClicksLastCheck = 0;

async function watchForNewClicks() {
  try {
    // קליקים מהדקה האחרונה
    const { data: recentClicks, error } = await supabase
      .from('clicks')
      .select('*')
      .gte('created_at', lastCheckTime.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // ספירה כללית
    const { data: totalData, error: totalError } = await supabase
      .from('clicks')
      .select('id');
    
    if (totalError) throw totalError;
    
    const currentTotalClicks = totalData.length;
    const newClicksThisCheck = recentClicks.length;
    const totalNewClicks = currentTotalClicks - totalClicksLastCheck;
    
    if (newClicksThisCheck > 0) {
      console.log(`\n🟢 ${new Date().toLocaleTimeString('he-IL')} - ${newClicksThisCheck} קליקים חדשים!`);
      
      recentClicks.forEach((click, index) => {
        const createdAt = new Date(click.created_at).toLocaleTimeString('he-IL');
        const clickType = click.is_paid ? 'ממומן' : 'אורגני';
        const gclid = click.gclid || 'ללא';
        console.log(`  ${index + 1}. ${createdAt} | ${clickType} | IP: ${click.ip_address} | Page: ${click.page}`);
      });
    } else {
      process.stdout.write('.');
    }
    
    // עדכון מונים
    lastCheckTime = new Date();
    totalClicksLastCheck = currentTotalClicks;
    
    if (totalNewClicks > 0) {
      console.log(`\n📊 סה"כ קליקים במסד הנתונים: ${currentTotalClicks} (+${totalNewClicks} מהבדיקה הקודמת)`);
    }
    
  } catch (error) {
    console.error('\n❌ שגיאה בבדיקת קליקים:', error.message);
  }
}

// קבלת ספירה ראשונית
async function getInitialCount() {
  try {
    const { data, error } = await supabase
      .from('clicks')
      .select('id');
    
    if (error) throw error;
    
    totalClicksLastCheck = data.length;
    console.log(`🔍 מתחיל לעקוב אחר קליקים חדשים...`);
    console.log(`📊 ספירה ראשונית: ${totalClicksLastCheck} קליקים`);
    console.log(`⏰ זמן התחלה: ${new Date().toLocaleString('he-IL')}`);
    console.log(`👀 עוקב אחר קליקים חדשים (נקודה = אין קליקים חדשים)\n`);
    
  } catch (error) {
    console.error('❌ שגיאה בקבלת ספירה ראשונית:', error.message);
  }
}

// התחלה
getInitialCount().then(() => {
  // בדיקה כל 2 שניות
  setInterval(watchForNewClicks, 2000);
});

// טיפול ביציאה נקיה
process.on('SIGINT', () => {
  console.log('\n\n👋 מפסיק לעקוב אחר קליקים. להתראות!');
  process.exit(0);
}); 
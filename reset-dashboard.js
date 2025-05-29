// איפוס מלא של נתוני הדשבורד
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function resetDashboard() {
    console.log('🗑️ מתחיל איפוס דשבורד...');
    
    try {
        // מחיקת כל הקליקים
        const { error: clicksError } = await supabase
            .from('clicks')
            .delete()
            .neq('id', 0); // מוחק הכל
            
        if (clicksError) throw clicksError;
        console.log('✅ קליקים נמחקו');
        
        // מחיקת קליקים חשודים
        const { error: suspiciousError } = await supabase
            .from('suspicious_clicks')
            .delete()
            .neq('id', 0); // מוחק הכל
            
        if (suspiciousError) throw suspiciousError;
        console.log('✅ קליקים חשודים נמחקו');
        
        // מחיקת IP חסומים (אופציונלי)
        const { error: blockedError } = await supabase
            .from('blocked_ips')
            .delete()
            .neq('id', 0); // מוחק הכל
            
        if (blockedError) throw blockedError;
        console.log('✅ IP חסומים נמחקו');
        
        console.log('🎉 איפוס דשבורד הושלם בהצלחה!');
        console.log('📊 כעת הדשבורד יתחיל מחדש עם נתונים נקיים');
        
    } catch (error) {
        console.error('❌ שגיאה באיפוס:', error);
    }
}

resetDashboard(); 
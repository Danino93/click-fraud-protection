// server.js - הקובץ הראשי של השרת - מתוקן

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const cron = require('node-cron');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// טעינת משתני הסביבה
dotenv.config();

// יצירת אפליקציית Express
const app = express();

// הגדרת trust proxy לקבלת IP האמיתי - זה קריטי!
app.set('trust proxy', true);

// הגדרת CORS מפורטת - מותאם לפרודקשן
app.use(cors({
  origin: function (origin, callback) {
    // רשימת דומיינים מורשים
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'https://ashaf-d.com',
      'http://ashaf-d.com',
      // הוסף כאן את הדומיין של הפרונטאנד בוורסל כשתקבל אותו
      // 'https://your-frontend-app.vercel.app'
    ];
    
    // אפשר גישה ללא origin (לבקשות מאפליקציות מובייל או Postman)
    if (!origin) return callback(null, true);
    
    // בפרודקשן - אפשר גישה מכל מקום (זמנית לבדיקה)
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// טיפול ב-preflight requests
app.options('*', cors());

// הגשת קבצים סטטיים (דשבורד)
app.use(express.static('public'));

// הגדרת קליינט Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// הגדרת קליינט Google Ads API
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// הגדרת טוקן הגישה של Google Ads
let googleAdsAuth = {
  access_token: process.env.GOOGLE_ACCESS_TOKEN,
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  token_type: 'Bearer',
  expiry_date: parseInt(process.env.GOOGLE_TOKEN_EXPIRY || '0')
};

oauth2Client.setCredentials(googleAdsAuth);

// הגדרת supabase כמשתנה גלובלי
global.supabase = supabase;

// פונקציה ליצירת כללי זיהוי ברירת מחדל
async function createDefaultDetectionRules() {
  try {
    // בדיקה אם כבר יש כללים
    const { data: existingRules, error: checkError } = await supabase
      .from('detection_rules')
      .select('*');
    
    if (checkError) {
      console.error('Error checking existing rules:', checkError);
      return;
    }
    
    // אם כבר יש כללים, לא נוסיף כללי ברירת מחדל
    if (existingRules && existingRules.length > 0) {
      console.log('✅ Detection rules already exist');
      return;
    }
    
    // כללי ברירת מחדל
    const defaultRules = [
      {
        rule_type: 'clicks_per_ip',
        rule_value: '5',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        rule_type: 'time_on_page',
        rule_value: '3',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        rule_type: 'rapid_clicks',
        rule_value: '10',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        rule_type: 'clicks_per_hour',
        rule_value: '100',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        rule_type: 'user_agent',
        rule_value: 'bot,crawler,spider,scraper',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        rule_type: 'geo_location',
        rule_value: 'RU,CN,KP,IR',
        is_active: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      // הכללים החדשים שהוספנו
      {
        rule_type: 'multiple_clicks',
        rule_value: '10', // מקסימום 10 קליקים בחלון זמן
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        rule_type: 'clicks_per_day',
        rule_value: '200', // מקסימום 200 קליקים ליום
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        rule_type: 'conversion_rate',
        rule_value: '0.5', // יחס המרה מינימלי של 0.5%
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    const { error } = await supabase
      .from('detection_rules')
      .insert(defaultRules);
    
    if (error) {
      console.error('Error creating default rules:', error);
    } else {
      console.log('✅ Default detection rules created successfully');
    }
  } catch (error) {
    console.error('Error in createDefaultDetectionRules:', error);
  }
}

// יצירת כללי ברירת מחדל בהפעלת השרת
createDefaultDetectionRules();

// ----- הגדרות אימות -----

// הגדרות משתמש ברירת מחדל (יכול להיות במסד נתונים בעתיד)
const DEFAULT_USER = {
  username: 'danino93',
  password: '$2b$10$0iRHJ9RGtD3Bpf.8kNmrOeutst5KMjLHtrlGF9LnyXIVT7Uh4vjM2' // password: DANINO151548e1d!
};

// מפתח סודי ל-JWT (בפרודקשן צריך להיות במשתני סביבה)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware לבדיקת JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ----- מודולים עיקריים -----

// מודול איסוף נתונים מ-Google Ads
const dataCollectionModule = require('./modules/dataCollection');

// מודול זיהוי קליקים חשודים
const fraudDetectionModule = require('./modules/fraudDetection');

// מודול חסימת IP
const blockingModule = require('./modules/blocking');

// ----- נתיבי API -----

// נתיב התחברות
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // בדיקת שם משתמש
    if (username !== DEFAULT_USER.username) {
      return res.status(401).json({ error: 'שם משתמש או סיסמא שגויים' });
    }

    // בדיקת סיסמא
    const isPasswordValid = await bcrypt.compare(password, DEFAULT_USER.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'שם משתמש או סיסמא שגויים' });
    }

    // יצירת JWT token
    const token = jwt.sign(
      { username: username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: token,
      message: 'התחברות בוצעה בהצלחה'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});

// נתיב לבדיקת תקפות token
app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// נתיב ראשי - הפניה לדשבורד
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// נתיב לקבלת נתוני קליקים
app.get('/api/clicks', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query; // 'paid', 'organic', או 'all'
    
    let query = supabase
      .from('clicks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    // סינון לפי סוג קליק
    if (type === 'paid') {
      query = query.eq('is_paid', true);
    } else if (type === 'organic') {
      query = query.eq('is_paid', false);
    }
    // אם type === 'all' או לא מוגדר, מחזיר הכל
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching clicks:', error);
    res.status(500).json({ error: 'Failed to fetch clicks' });
  }
});

// נתיב לקבלת IP חסומים
app.get('/api/blocked-ips', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching blocked IPs:', error);
    res.status(500).json({ error: 'Failed to fetch blocked IPs' });
  }
});

// נתיב להוספת IP לרשימת החסומים
app.post('/api/block-ip', authenticateToken, async (req, res) => {
  try {
    const { ip, reason, campaign_id } = req.body;
    
    // בדיקה אם ה-IP כבר חסום
    const { data: existingIP } = await supabase
      .from('blocked_ips')
      .select('*')
      .eq('ip_address', ip)
      .single();
    
    if (existingIP) {
      return res.status(400).json({ error: 'IP is already blocked' });
    }
    
    // הוספת ה-IP לרשימת החסומים
    const { data, error } = await supabase
      .from('blocked_ips')
      .insert([
        { 
          ip_address: ip, 
          reason, 
          campaign_id,
          blocked_by: 'manual',
          created_at: new Date()
        }
      ]);
    
    if (error) throw error;
    
    // עדכון הרשימה ב-Google Ads
    await blockingModule.updateGoogleAdsBlockedList(oauth2Client);
    
    res.json({ success: true, message: 'IP blocked successfully' });
  } catch (error) {
    console.error('Error blocking IP:', error);
    res.status(500).json({ error: 'Failed to block IP' });
  }
});

// נתיב להסרת IP מרשימת החסומים
app.delete('/api/unblock-ip/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('blocked_ips')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // עדכון הרשימה ב-Google Ads
    await blockingModule.updateGoogleAdsBlockedList(oauth2Client);
    
    res.json({ success: true, message: 'IP unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({ error: 'Failed to unblock IP' });
  }
});

// נתיב לקבלת כללי זיהוי
app.get('/api/detection-rules', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('detection_rules')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching detection rules:', error);
    res.status(500).json({ error: 'Failed to fetch detection rules' });
  }
});

// נתיב לקבלת קליקים חשודים
app.get('/api/suspicious-clicks', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suspicious_clicks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching suspicious clicks:', error);
    res.status(500).json({ error: 'Failed to fetch suspicious clicks' });
  }
});

// נתיב לעדכון כללי זיהוי
app.post('/api/detection-rules', authenticateToken, async (req, res) => {
  try {
    const { rules } = req.body;
    
    // עדכון כללי הזיהוי במסד הנתונים
    const { error } = await supabase
      .from('detection_rules')
      .upsert(rules.map(rule => ({
        id: rule.id || undefined,
        rule_type: rule.type,
        rule_value: rule.value,
        is_active: rule.isActive,
        updated_at: new Date()
      })));
    
    if (error) throw error;
    
    res.json({ success: true, message: 'Detection rules updated successfully' });
  } catch (error) {
    console.error('Error updating detection rules:', error);
    res.status(500).json({ error: 'Failed to update detection rules' });
  }
});

// נתיב לאיסוף נתוני התנהגות מהאתר - מתוקן!
app.post('/api/track', async (req, res) => {
  try {
    const { 
      user_agent, 
      referrer, 
      page, 
      gclid, 
      time_on_page,
      visit_start, 
      additional_data,
      event_type 
    } = req.body;
    
    // קבלת כתובת IP האמיתית של המשתמש
    const clientIP = req.ip || 
                    req.connection?.remoteAddress || 
                    req.socket?.remoteAddress ||
                    req.headers['x-forwarded-for']?.split(',')[0] ||
                    req.headers['x-real-ip'] ||
                    'unknown';
    
    console.log('📥 Tracking data received:', {
      ip: clientIP,
      gclid,
      page,
      event_type,
      time_on_page,
      user_agent: user_agent?.substring(0, 50) + '...'
    });
    
    // בדיקה אם זה קליק ממומן (יש gclid) או קליק אורגני
    const isPaidClick = gclid && gclid.trim() !== '';
    const clickType = isPaidClick ? 'paid' : 'organic';
    
    console.log(`🔍 Click type: ${clickType}${isPaidClick ? ` (gclid: ${gclid})` : ''}`);
    
    // שמירת הנתונים במסד הנתונים
    const { data, error } = await supabase
      .from('clicks')
      .insert([
        {
          ip_address: clientIP,
          user_agent,
          referrer,
          page,
          gclid,
          time_on_page,
          visit_start,
          event_type: event_type || 'pageview',
          click_type: clickType,
          is_paid: isPaidClick,
          additional_data,
          created_at: new Date()
        }
      ]);
    
    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }
    
    console.log('✅ Click data saved successfully');
    
    // בדיקה האם הקליק חשוד
    const isSuspicious = await fraudDetectionModule.detectFraudClick({
      ip_address: clientIP,
      user_agent, 
      referrer, 
      page, 
      gclid, 
      time_on_page,
      visit_start, 
      additional_data,
      is_paid: isPaidClick
    });
    
    console.log('🔍 Fraud detection result:', isSuspicious);
    
    // חסימת IP אוטומטית רק לקליקים ממומנים חשודים!
    // להפעלת חסימה אוטומטית: הגדר AUTO_BLOCK_SUSPICIOUS=true בקובץ .env
    if (isSuspicious && isPaidClick && process.env.AUTO_BLOCK_SUSPICIOUS === 'true') {
      console.log('🚫 Blocking suspicious PAID click IP:', clientIP);
      await blockingModule.blockIP(clientIP, 'Automatic - Suspicious paid click activity', null);
      await blockingModule.updateGoogleAdsBlockedList(oauth2Client);
    } else if (isSuspicious && isPaidClick) {
      console.log('⚠️ Suspicious PAID click detected (auto-blocking disabled):', clientIP);
    } else if (isSuspicious && !isPaidClick) {
      console.log('⚠️ Suspicious ORGANIC click detected (NOT blocking - organic clicks are never blocked):', clientIP);
    }
    
    res.json({ success: true, tracked: true, suspicious: isSuspicious });
  } catch (error) {
    console.error('❌ Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click', details: error.message });
  }
});

// נתיב לבדיקת האם IP חסום
app.get('/api/check-ip/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('*')
      .eq('ip_address', ip)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    res.json({ isBlocked: !!data });
  } catch (error) {
    console.error('Error checking IP:', error);
    res.status(500).json({ error: 'Failed to check IP' });
  }
});

// ----- תזמון משימות -----

// איסוף נתונים מ-Google Ads כל שעה
cron.schedule('0 * * * *', async () => {
  try {
    console.log('📊 Fetching data from Google Ads...');
    await dataCollectionModule.fetchGoogleAdsData(oauth2Client, supabase);
  } catch (error) {
    console.error('Error in scheduled Google Ads data fetch:', error);
  }
});

// ניתוח קליקים חשודים כל 15 דקות
cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('🔍 Analyzing suspicious clicks...');
    const suspiciousIPs = await fraudDetectionModule.analyzeSuspiciousClicks(supabase, true); // true = רק קליקים ממומנים
    
    if (suspiciousIPs.length > 0 && process.env.AUTO_BLOCK_SUSPICIOUS === 'true') {
      for (const ip of suspiciousIPs) {
        await blockingModule.blockIP(ip, 'Automatic - Suspicious paid click pattern detected', null);
      }
      await blockingModule.updateGoogleAdsBlockedList(oauth2Client);
      console.log(`🚫 Blocked ${suspiciousIPs.length} IPs for suspicious PAID click patterns`);
    }
  } catch (error) {
    console.error('Error in scheduled suspicious clicks analysis:', error);
  }
});

// הפעלת השרת
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard available at: http://localhost:${PORT}`);
  console.log(`🔧 API endpoint: http://localhost:${PORT}/api/track`);
});
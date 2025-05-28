// modules/fraudDetection.js
// מודול זיהוי קליקים חשודים - מושלם עם כללים בסיסיים ומתקדמים

/**
 * בדיקה האם קליק מסוים חשוד כמזויף (כללים בסיסיים)
 * @param {Object} clickData - נתוני הקליק לבדיקה
 * @returns {Boolean} - האם הקליק חשוד
 */
async function detectFraudClick(clickData) {
  try {
      // קבלת כל כללי הזיהוי הפעילים
      const { data: rules } = await global.supabase
          .from('detection_rules')
          .select('*')
          .eq('is_active', true);
      
      if (!rules || rules.length === 0) {
          return false; // אין כללים פעילים
      }
      
      const isPaidClick = clickData.is_paid || false;
      
      // מעבר על כל הכללים ובדיקה האם הקליק חשוד
      for (const rule of rules) {
          const isSuspicious = applyDetectionRule(rule, clickData);
          if (isSuspicious) {
              // לוגים של קליק חשוד עם ציון סוג הקליק
              await logSuspiciousClick(clickData, rule);
              console.log(`🔍 Suspicious ${isPaidClick ? 'PAID' : 'ORGANIC'} click detected from IP: ${clickData.ip_address} (Rule: ${rule.rule_type})`);
              return true;
          }
      }
      
      return false;
  } catch (error) {
      console.error('Error in detectFraudClick:', error);
      return false;
  }
}

/**
* יישום כלל זיהוי ספציפי על נתוני קליק (כללים בסיסיים)
* @param {Object} rule - כלל הזיהוי
* @param {Object} clickData - נתוני הקליק
* @returns {Boolean} - האם הקליק חשוד לפי הכלל
*/
function applyDetectionRule(rule, clickData) {
  switch (rule.rule_type) {
      case 'time_on_page':
          // בדיקה אם זמן השהייה בדף קצר מדי
          return clickData.time_on_page < parseInt(rule.rule_value);
          
      case 'multiple_clicks':
          // חלק מלוגיקה מורכבת יותר שמטופלת ב-analyzeSuspiciousClicks
          return false;
          
      case 'geo_location':
          // בדיקה אם המיקום הגיאוגרפי חשוד (צריך להוסיף שירות גיאולוקציה)
          const blockedCountries = rule.rule_value.split(',');
          // דוגמה בלבד - צריך להוסיף לוגיקה אמיתית לזיהוי מדינה לפי IP
          const userCountry = getCountryFromIP(clickData.ip_address);
          return blockedCountries.includes(userCountry);
          
      case 'user_agent':
          // בדיקה אם ה-User Agent חשוד
          return rule.rule_value.split(',').some(agent => 
              clickData.user_agent.toLowerCase().includes(agent.toLowerCase())
          );
          
      case 'referrer':
          // בדיקה אם המפנה חשוד
          if (rule.rule_value === 'empty' && (!clickData.referrer || clickData.referrer === '')) {
              return true;
          }
          return rule.rule_value.split(',').some(ref => 
              clickData.referrer && clickData.referrer.toLowerCase().includes(ref.toLowerCase())
          );
          
      case 'bot_pattern':
          // בדיקת דפוסי התנהגות של בוטים
          // דוגמה פשוטה - בדיקה אם יש מילות מפתח של בוטים ב-User Agent
          const botKeywords = ['bot', 'crawler', 'spider', 'scraper'];
          return botKeywords.some(keyword => 
              clickData.user_agent.toLowerCase().includes(keyword)
          );
          
      // הכללים החדשים שהוספנו
      case 'rapid_clicks':
          // בדיקת קליקים מהירים - נבדק אם יש נתונים על קליקים מהירים
          const rapidClicks = clickData.additional_data?.rapid_clicks_detected || 0;
          return rapidClicks > parseInt(rule.rule_value);
          
      case 'clicks_per_hour':
          // בדיקת מספר קליקים לשעה
          const clicksPerHour = clickData.additional_data?.clicks_per_hour || 0;
          return clicksPerHour > parseInt(rule.rule_value);
          
      case 'clicks_per_day':
          // בדיקת מספר קליקים ליום
          const clicksPerDay = clickData.additional_data?.clicks_per_day || 0;
          return clicksPerDay > parseInt(rule.rule_value);
          
      case 'conversion_rate':
          // בדיקת יחס המרה נמוך מדי (חשוד)
          const conversionRate = clickData.additional_data?.conversion_rate || 0;
          const minConversionRate = parseFloat(rule.rule_value);
          // אם יש יותר מ-10 קליקים ויחס ההמרה נמוך מדי - חשוד
          const totalClicks = clickData.additional_data?.click_count || 0;
          return totalClicks > 10 && conversionRate < minConversionRate;
          
      default:
          return false;
  }
}

/**
* כללי זיהוי מתקדמים נוספים
* @param {Object} rule - כלל הזיהוי
* @param {Object} clickData - נתוני הקליק
* @param {Array} recentClicks - קליקים אחרונים לניתוח דפוסים
* @returns {Boolean} - האם הקליק חשוד לפי הכלל המתקדם
*/
function applyAdvancedDetectionRules(rule, clickData, recentClicks) {
  switch (rule.rule_type) {
      case 'multiple_clicks_threshold':
          // בדיקת קליקים מרובים עם סף מותאם אישית
          const [windowMinutes, threshold] = rule.rule_value.split(',');
          return countRecentClicksFromIP(clickData.ip_address, parseInt(windowMinutes), recentClicks) > parseInt(threshold);
          
      case 'scroll_behavior':
          // בדיקת התנהגות גלילה חשודה
          const scrollData = clickData.additional_data?.scroll_depth || 0;
          const minScroll = parseInt(rule.rule_value);
          return scrollData < minScroll; // לא גלל מספיק
          
      case 'mouse_activity':
          // בדיקת פעילות עכבר
          const mouseMovements = clickData.additional_data?.mouse_movements || 0;
          const minMovements = parseInt(rule.rule_value);
          return mouseMovements < minMovements; // פעילות עכבר נמוכה
          
      case 'session_duration':
          // בדיקת משך סשן
          const sessionStart = new Date(clickData.visit_start);
          const now = new Date();
          const sessionDuration = (now - sessionStart) / 1000; // בשניות
          const minDuration = parseInt(rule.rule_value);
          return sessionDuration < minDuration;
          
      case 'click_pattern':
          // בדיקת דפוס קליקים חשוד
          const pattern = rule.rule_value; // "rapid" / "identical_timing" / "no_variation"
          return analyzeClickPattern(clickData, pattern, recentClicks);
          
      case 'device_fingerprint':
          // בדיקת זיהוי התקן חשוד
          const suspiciousDevices = rule.rule_value.split(',');
          const deviceInfo = `${clickData.additional_data?.platform}_${clickData.additional_data?.screen_width}x${clickData.additional_data?.screen_height}`;
          return suspiciousDevices.some(device => deviceInfo.includes(device));
          
      case 'timezone_mismatch':
          // בדיקת אי התאמה באזור זמן
          const expectedTimezone = rule.rule_value;
          const userTimezone = clickData.additional_data?.timezone || '';
          return expectedTimezone !== userTimezone;
          
      case 'bounce_rate':
          // בדיקת bounce rate גבוה מאותו IP
          const bounceThreshold = parseFloat(rule.rule_value); // 0.8 = 80%
          return calculateBounceRate(clickData.ip_address, recentClicks) > bounceThreshold;
          
      case 'conversion_funnel':
          // בדיקת התנהגות בלתי רגילה במשפך המרות
          const funnelSteps = rule.rule_value.split(','); // "landing,product,cart,checkout"
          return analyzeConversionFunnel(clickData, funnelSteps);
          
      case 'referrer_chain':
          // בדיקת שרשרת מפנים חשודה
          const suspiciousReferrers = rule.rule_value.split(',');
          return suspiciousReferrers.some(ref => 
              clickData.referrer && clickData.referrer.toLowerCase().includes(ref.toLowerCase())
          );
          
      case 'language_mismatch':
          // בדיקת אי התאמה בשפה
          const expectedLanguages = rule.rule_value.split(','); // "he,en"
          const userLanguage = clickData.additional_data?.language || '';
          return !expectedLanguages.some(lang => userLanguage.startsWith(lang));
          
      case 'form_abandonment':
          // בדיקת נטישת טפסים חשודה
          const abandonmentRate = parseFloat(rule.rule_value); // 0.9 = 90%
          return analyzeFormAbandonment(clickData, abandonmentRate);
          
      // הכללים החדשים שהוספנו - גרסה מתקדמת
      case 'multiple_clicks':
          // בדיקת קליקים מרובים בחלונות זמן שונים
          const multipleClicks5min = clickData.additional_data?.multiple_clicks_5min || 0;
          const multipleClicks10min = clickData.additional_data?.multiple_clicks_10min || 0;
          const multipleClicks30min = clickData.additional_data?.multiple_clicks_30min || 0;
          const multipleClicksThreshold = parseInt(rule.rule_value);
          
          // חשוד אם יש יותר מדי קליקים בכל אחד מחלונות הזמן
          return multipleClicks5min > multipleClicksThreshold || 
                 multipleClicks10min > (multipleClicksThreshold * 2) || 
                 multipleClicks30min > (multipleClicksThreshold * 5);
          
      case 'rapid_clicks':
          // גרסה מתקדמת של זיהוי קליקים מהירים
          const rapidClicksDetected = clickData.additional_data?.rapid_clicks_detected || 0;
          const clickPatternVariance = clickData.additional_data?.click_pattern_variance || 1000;
          const rapidClicksThreshold = parseInt(rule.rule_value);
          
          // חשוד אם יש קליקים מהירים ושונות נמוכה בדפוס
          return rapidClicksDetected > rapidClicksThreshold && clickPatternVariance < 100;
          
      case 'clicks_per_hour':
          // גרסה מתקדמת - בדיקה מול היסטוריה
          const currentHourClicks = clickData.additional_data?.clicks_per_hour || 0;
          const avgHourlyClicks = calculateAverageHourlyClicks(clickData.ip_address, recentClicks);
          const hourlyThreshold = parseInt(rule.rule_value);
          
          // חשוד אם חורג מהסף או פי 3 מהממוצע
          return currentHourClicks > hourlyThreshold || 
                 (avgHourlyClicks > 0 && currentHourClicks > avgHourlyClicks * 3);
          
      case 'clicks_per_day':
          // גרסה מתקדמת - בדיקה מול היסטוריה יומית
          const currentDayClicks = clickData.additional_data?.clicks_per_day || 0;
          const avgDailyClicks = calculateAverageDailyClicks(clickData.ip_address, recentClicks);
          const dailyThreshold = parseInt(rule.rule_value);
          
          // חשוד אם חורג מהסף או פי 2 מהממוצע
          return currentDayClicks > dailyThreshold || 
                 (avgDailyClicks > 0 && currentDayClicks > avgDailyClicks * 2);
          
      case 'conversion_rate':
          // גרסה מתקדמת של בדיקת יחס המרה
          const conversionRate = clickData.additional_data?.conversion_rate || 0;
          const totalClicks = clickData.additional_data?.click_count || 0;
          const conversionEvents = clickData.additional_data?.conversion_events || [];
          const minRate = parseFloat(rule.rule_value);
          
          // חשוד אם יש הרבה קליקים, יחס המרה נמוך, ואין אירועי המרה אמיתיים
          return totalClicks > 20 && 
                 conversionRate < minRate && 
                 conversionEvents.length === 0;
          
      default:
          // אם זה כלל בסיסי, נשתמש בפונקציה הרגילה
          return applyDetectionRule(rule, clickData);
  }
}

/**
* לוגים של קליק חשוד (בסיסי)
* @param {Object} clickData - נתוני הקליק
* @param {Object} rule - הכלל שזיהה את הקליק כחשוד
*/
async function logSuspiciousClick(clickData, rule) {
  try {
      await global.supabase
          .from('suspicious_clicks')
          .insert([
              {
                  ip_address: clickData.ip_address,
                  rule_id: rule.id,
                  rule_type: rule.rule_type,
                  click_data: clickData,
                  created_at: new Date()
              }
          ]);
  } catch (error) {
      console.error('Error logging suspicious click:', error);
  }
}

/**
* פונקציה שמנתחת דפוסים של קליקים חשודים לאורך זמן
* @param {Object} supabase - קליינט Supabase
* @returns {Array} - רשימת כתובות IP חשודות
*/
async function analyzeSuspiciousClicks(supabase, paidClicksOnly = false) {
  try {
      const suspiciousIPs = [];
      
      // קבלת כללי הזיהוי הפעילים
      const { data: rules } = await supabase
          .from('detection_rules')
          .select('*')
          .eq('is_active', true);
      
      // לכל כלל, ביצוע ניתוח ספציפי
      for (const rule of rules) {
          if (rule.rule_type === 'multiple_clicks') {
              // בדיקת קליקים מרובים מאותו IP בזמן קצר
              const timeWindow = parseInt(rule.rule_value); // בדקות
              const thresholdCount = 5; // סף מספר קליקים (ניתן להגדיר כפרמטר)
              
              const timeWindowMs = timeWindow * 60 * 1000;
              const minTime = new Date(Date.now() - timeWindowMs);
              
              // שליפת קליקים בחלון הזמן הנדרש - רק ממומנים אם נדרש
              let query = supabase
                  .from('clicks')
                  .select('ip_address, created_at, is_paid')
                  .gte('created_at', minTime.toISOString());
              
              if (paidClicksOnly) {
                  query = query.eq('is_paid', true);
              }
              
              const { data: recentClicks } = await query;
              
              if (recentClicks && recentClicks.length > 0) {
                  // ספירת קליקים לפי IP
                  const clickCountByIP = {};
                  recentClicks.forEach(click => {
                      clickCountByIP[click.ip_address] = (clickCountByIP[click.ip_address] || 0) + 1;
                  });
                  
                  // זיהוי IP עם מספר קליקים מעל הסף
                  Object.entries(clickCountByIP).forEach(([ip, count]) => {
                      if (count > thresholdCount) {
                          suspiciousIPs.push(ip);
                          console.log(`🚨 Suspicious IP detected: ${ip} (${count} ${paidClicksOnly ? 'paid ' : ''}clicks in ${timeWindow} minutes)`);
                      }
                  });
              }
          } else if (rule.rule_type === 'conversion_rate') {
              // בדיקת יחס המרה נמוך מדי עבור IP ספציפי
              // לוגיקה זו דורשת נתונים על המרות שצריכים להגיע מהאתר
              // אפשר להרחיב בהמשך
          }
      }
      
      return [...new Set(suspiciousIPs)]; // הסרת כפילויות
  } catch (error) {
      console.error('Error in analyzeSuspiciousClicks:', error);
      return [];
  }
}

/**
* פונקציה מעודכנת לזיהוי קליקים חשודים עם כללים מתקדמים
* @param {Object} clickData - נתוני הקליק לבדיקה
* @returns {Boolean} - האם הקליק חשוד
*/
async function detectAdvancedFraudClick(clickData) {
  try {
      // קבלת כל כללי הזיהוי הפעילים
      const { data: rules } = await global.supabase
          .from('detection_rules')
          .select('*')
          .eq('is_active', true);
          
      if (!rules || rules.length === 0) {
          return false;
      }
      
      // קבלת קליקים אחרונים לניתוח דפוסים
      const { data: recentClicks } = await global.supabase
          .from('clicks')
          .select('*')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24 שעות אחרונות
          .order('created_at', { ascending: false });
      
      // מעבר על כל הכללים המתקדמים
      for (const rule of rules) {
          const isSuspicious = applyAdvancedDetectionRules(rule, clickData, recentClicks || []);
          if (isSuspicious) {
              // לוגים של קליק חשוד עם פרטים מתקדמים
              await logSuspiciousClickAdvanced(clickData, rule, recentClicks);
              return true;
          }
      }
      
      return false;
  } catch (error) {
      console.error('Error in detectAdvancedFraudClick:', error);
      return false;
  }
}

// ============ פונקציות עזר מתקדמות ============

/**
* ספירת קליקים אחרונים מאותו IP
*/
function countRecentClicksFromIP(ip, windowMinutes, recentClicks) {
  const windowMs = windowMinutes * 60 * 1000;
  const cutoffTime = Date.now() - windowMs;
  
  return recentClicks.filter(click => 
      click.ip_address === ip && 
      new Date(click.created_at).getTime() > cutoffTime
  ).length;
}

/**
* ניתוח דפוס קליקים
*/
function analyzeClickPattern(clickData, pattern, recentClicks) {
  const ipClicks = recentClicks.filter(click => click.ip_address === clickData.ip_address);
  
  switch (pattern) {
      case 'rapid':
          // קליקים מהירים מדי (פחות מ-3 שניות בין קליקים)
          if (ipClicks.length < 2) return false;
          const intervals = [];
          for (let i = 1; i < ipClicks.length; i++) {
              const timeDiff = new Date(ipClicks[i].created_at) - new Date(ipClicks[i-1].created_at);
              intervals.push(timeDiff);
          }
          return intervals.some(interval => interval < 3000); // פחות מ-3 שניות
          
      case 'identical_timing':
          // קליקים בזמנים זהים מדי (רזולוציה של שנייה)
          const timestamps = ipClicks.map(click => 
              Math.floor(new Date(click.created_at).getTime() / 1000)
          );
          const uniqueTimestamps = new Set(timestamps);
          return timestamps.length > uniqueTimestamps.size;
          
      case 'no_variation':
          // אין וריאציה בהתנהגות (אותם דפים, אותו זמן בדף)
          if (ipClicks.length < 3) return false;
          const pages = new Set(ipClicks.map(click => click.page));
          const timeOnPages = new Set(ipClicks.map(click => click.time_on_page));
          return pages.size === 1 && timeOnPages.size === 1;
          
      default:
          return false;
  }
}

/**
* חישוב bounce rate לIP
*/
function calculateBounceRate(ip, recentClicks) {
  const ipClicks = recentClicks.filter(click => click.ip_address === ip);
  if (ipClicks.length === 0) return 0;
  
  const bounces = ipClicks.filter(click => click.time_on_page < 10).length; // פחות מ-10 שניות = bounce
  return bounces / ipClicks.length;
}

/**
* ניתוח משפך המרות
*/
function analyzeConversionFunnel(clickData, funnelSteps) {
  // בדיקה אם המשתמש דילג על שלבים במשפך
  const currentPage = clickData.page;
  const currentStepIndex = funnelSteps.findIndex(step => currentPage.includes(step));
  
  if (currentStepIndex === -1) return false; // הדף לא במשפך
  if (currentStepIndex === 0) return false; // דף ראשון במשפך
  
  // בדוק אם יש היסטוריה של הדפים הקודמים
  const sessionClicks = clickData.additional_data?.user_interactions || [];
  const visitedPages = sessionClicks.map(interaction => interaction.page);
  
  // בדוק אם דילג על שלבים
  for (let i = 0; i < currentStepIndex; i++) {
      if (!visitedPages.some(page => page.includes(funnelSteps[i]))) {
          return true; // דילג על שלב
      }
  }
  
  return false;
}

/**
* ניתוח נטישת טפסים
*/
function analyzeFormAbandonment(clickData, abandonmentThreshold) {
  const formInteractions = clickData.additional_data?.form_interactions || [];
  if (formInteractions.length === 0) return false;
  
  // חישוב יחס נטישה - כמה טפסים התחילו אבל לא סיימו
  const formsStarted = new Set(formInteractions.map(interaction => interaction.form_id));
  const formsCompleted = formInteractions.filter(interaction => 
      interaction.type === 'form_submit'
  ).length;
  
  if (formsStarted.size === 0) return false;
  
  const abandonmentRate = 1 - (formsCompleted / formsStarted.size);
  return abandonmentRate > abandonmentThreshold;
}

/**
* לוגים מתקדמים של קליק חשוד
*/
async function logSuspiciousClickAdvanced(clickData, rule, recentClicks) {
  try {
      // חישוב מטרות נוספות לניתוח
      const ipHistory = recentClicks.filter(click => click.ip_address === clickData.ip_address);
      const riskScore = calculateRiskScore(clickData, ipHistory);
      
      await global.supabase
          .from('suspicious_clicks')
          .insert([
              {
                  ip_address: clickData.ip_address,
                  rule_id: rule.id,
                  rule_type: rule.rule_type,
                  click_data: clickData,
                  risk_score: riskScore,
                  ip_history_count: ipHistory.length,
                  analysis_metadata: {
                      detection_time: new Date().toISOString(),
                      rule_value: rule.rule_value,
                      session_id: clickData.additional_data?.session_id,
                      user_agent_hash: hashUserAgent(clickData.user_agent)
                  },
                  created_at: new Date()
              }
          ]);
  } catch (error) {
      console.error('Error logging advanced suspicious click:', error);
  }
}

/**
* חישוב ציון סיכון
*/
function calculateRiskScore(clickData, ipHistory) {
  let score = 0;
  
  // משקל לפי זמן בדף
  if (clickData.time_on_page < 5) score += 30;
  else if (clickData.time_on_page < 15) score += 15;
  
  // משקל לפי היסטוריית IP
  if (ipHistory.length > 10) score += 25; // IP פעיל מדי
  if (ipHistory.length === 1) score += 10; // IP חדש
  
  // משקל לפי פעילות עכבר
  const mouseMovements = clickData.additional_data?.mouse_movements || 0;
  if (mouseMovements === 0) score += 20;
  else if (mouseMovements < 10) score += 10;
  
  // משקל לפי גלילה
  const scrollDepth = clickData.additional_data?.scroll_depth || 0;
  if (scrollDepth === 0) score += 15;
  else if (scrollDepth < 25) score += 8;
  
  // משקל לפי user agent
  if (isKnownBot(clickData.user_agent)) score += 40;
  
  return Math.min(score, 100); // מקסימום 100
}

/**
* בדיקת בוטים ידועים
*/
function isKnownBot(userAgent) {
  const botKeywords = [
      'bot', 'crawler', 'spider', 'scraper', 'headless',
      'phantom', 'selenium', 'automated', 'python-requests',
      'curl', 'wget', 'postman'
  ];
  
  return botKeywords.some(keyword => 
      userAgent.toLowerCase().includes(keyword)
  );
}

/**
* הצפנת user agent למעקב
*/
function hashUserAgent(userAgent) {
  // hash פשוט לזיהוי (לא קריפטוגרפי)
  let hash = 0;
  for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // המרה ל-32bit integer
  }
  return hash.toString(36);
}

/**
* פונקציה להמרת IP למדינה (דוגמה בסיסית)
* במערכת אמיתית יש להשתמש בשירות גיאולוקציה
* @param {String} ip - כתובת ה-IP
* @returns {String} - קוד המדינה
*/
function getCountryFromIP(ip) {
  // דוגמה בלבד - במערכת אמיתית נשתמש ב-API לגיאולוקציה
  // כמו MaxMind, ipstack וכדומה
  return 'IL'; // ברירת מחדל - ישראל
}

/**
 * חישוב ממוצע קליקים שעתי עבור IP
 */
function calculateAverageHourlyClicks(ip, recentClicks) {
    const ipClicks = recentClicks.filter(click => click.ip_address === ip);
    if (ipClicks.length === 0) return 0;
    
    const hourlyGroups = {};
    ipClicks.forEach(click => {
        const hour = new Date(click.created_at).getHours();
        const date = new Date(click.created_at).toDateString();
        const key = `${date}_${hour}`;
        
        if (!hourlyGroups[key]) {
            hourlyGroups[key] = 0;
        }
        hourlyGroups[key]++;
    });
    
    const hourlyTotals = Object.values(hourlyGroups);
    return hourlyTotals.length > 0 ? 
           hourlyTotals.reduce((sum, count) => sum + count, 0) / hourlyTotals.length : 0;
}

/**
 * חישוב ממוצע קליקים יומי עבור IP
 */
function calculateAverageDailyClicks(ip, recentClicks) {
    const ipClicks = recentClicks.filter(click => click.ip_address === ip);
    if (ipClicks.length === 0) return 0;
    
    const dailyGroups = {};
    ipClicks.forEach(click => {
        const date = new Date(click.created_at).toDateString();
        
        if (!dailyGroups[date]) {
            dailyGroups[date] = 0;
        }
        dailyGroups[date]++;
    });
    
    const dailyTotals = Object.values(dailyGroups);
    return dailyTotals.length > 0 ? 
           dailyTotals.reduce((sum, count) => sum + count, 0) / dailyTotals.length : 0;
}

module.exports = {
  detectFraudClick,
  analyzeSuspiciousClicks,
  detectAdvancedFraudClick,
  calculateRiskScore,
  isKnownBot,
  hashUserAgent,
  getCountryFromIP,
  calculateAverageHourlyClicks,
  calculateAverageDailyClicks
};
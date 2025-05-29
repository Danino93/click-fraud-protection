/**
 * 🛡️ מערכת הגנה מפני קליקים מזויפים - מותאם לפרויקט
 * גרסה להטמעה ישירה באתר
 * 
 * ✅ עוקב אחרי כל התעבורה (אורגנית + ממומנת)
 * ✅ השרת חוסם רק קליקים ממומנים חשודים
 * ✅ קליקים אורגניים חשודים - רק מתועדים, לא נחסמים
 * ✅ מותאם לכללי הזיהוי המתקדמים של הפרויקט
 * 
 * הוראות הטמעה:
 * 1. העתק את הקובץ הזה לתיקיית js באתר שלך
 * 2. הוסף לפני סגירת </body>:
 *    <script src="js/fraud-detection.js"></script>
 * 3. זהו! המערכת תתחיל לעבוד אוטומטית
 */

(function() {
    'use strict';
    
    // ⚙️ הגדרות המערכת
    var CONFIG = {
        // כתובת השרת שלך
        API_URL: 'https://click-fraud-backend.vercel.app/api/track',
        
        // האם לעקוב רק אחרי תעבורה ממומנת (עם gclid)
        // false = עוקב אחרי הכל (המלצה - השרת מחליט מה לחסום)
        ONLY_PAID_TRAFFIC: false,
        
        // מצב דיבוג (true = רואה הודעות בקונסול)
        DEBUG_MODE: true, // שנה ל-false בפרודקשן
        
        // כל כמה זמן לשלוח נתונים (במילישניות)
        SEND_INTERVAL: 60000, // 60 שניות (הוגדל מ-30)
        
        // מינימום זמן בעמוד לפני שליחה (במילישניות)
        MIN_TIME_ON_PAGE: 3000, // 3 שניות (הוגדל מ-2)
        
        // מקסימום נתונים לשמור בזיכרון
        MAX_EVENTS: 50,
        
        // הגדרות מתקדמות למעקב
        MOUSE_TRACKING_THROTTLE: 100, // מילישניות בין מעקב תנועות עכבר
        SCROLL_TRACKING_THROTTLE: 250, // מילישניות בין מעקב גלילה
        INTERACTION_TRACKING: true, // מעקב אחר אינטראקציות משתמש
        FORM_TRACKING: true, // מעקב אחר טפסים
        FOCUS_TRACKING: true // מעקב אחר פוקוס חלון
    };
    
    // דגל למניעת שליחה כפולה
    var lastSentTime = 0;
    var DUPLICATE_PREVENTION_WINDOW = 10000; // 10 שניות
    
    // 🔧 פונקציות עזר
    function debugLog(message, data) {
        if (CONFIG.DEBUG_MODE) {
            console.log('[🛡️ Fraud Detection] ' + message, data || '');
        }
    }
    
    function getTimestamp() {
        return new Date().toISOString();
    }
    
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 📊 ניהול Session
    function getOrCreateSessionId() {
        var sessionId = sessionStorage.getItem('fraud_detection_session');
        if (!sessionId) {
            sessionId = generateSessionId();
            sessionStorage.setItem('fraud_detection_session', sessionId);
            debugLog('🆕 Session חדש נוצר: ' + sessionId);
        }
        return sessionId;
    }
    
    // 🌐 קבלת פרמטרים מה-URL
    function getUrlParameter(name) {
        var urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
    
    function getGclid() {
        return getUrlParameter('gclid');
    }
    
    function isPaidTraffic() {
        var gclid = getGclid();
        var result = !!gclid;
        
        debugLog('🔍 בדיקת סוג תעבורה:', {
            gclid: gclid || 'ריק',
            isPaid: result,
            url: window.location.href,
            referrer: document.referrer || 'ריק'
        });
        
        return result;
    }
    
    // 📱 איסוף מידע מפורט על המכשיר והדפדפן (לכללי זיהוי מתקדמים)
    function getDeviceInfo() {
        var deviceInfo = {
            user_agent: navigator.userAgent,
            screen_width: screen.width,
            screen_height: screen.height,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
            language: navigator.language,
            platform: navigator.platform,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookie_enabled: navigator.cookieEnabled,
            online: navigator.onLine,
            color_depth: screen.colorDepth,
            pixel_ratio: window.devicePixelRatio || 1
        };
        
        // מידע נוסף לזיהוי התקן (device fingerprinting)
        try {
            deviceInfo.hardware_concurrency = navigator.hardwareConcurrency || 'unknown';
            deviceInfo.max_touch_points = navigator.maxTouchPoints || 0;
            deviceInfo.connection_type = navigator.connection ? navigator.connection.effectiveType : 'unknown';
        } catch (e) {
            // דפדפנים ישנים עלולים לא לתמוך
        }
        
        return deviceInfo;
    }
    
    // 🌍 איסוף מידע מפורט על העמוד
    function getPageInfo() {
        return {
            url: window.location.href,
            pathname: window.location.pathname,
            title: document.title,
            referrer: document.referrer,
            gclid: getGclid(),
            is_paid_traffic: isPaidTraffic(),
            page_load_time: performance.timing ? 
                (performance.timing.loadEventEnd - performance.timing.navigationStart) : 0,
            dom_ready_time: performance.timing ? 
                (performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart) : 0
        };
    }
    
    // 📈 מחלקה מתקדמת לניהול נתוני המעקב
    function TrackingData() {
        this.sessionId = getOrCreateSessionId();
        this.visitStart = getTimestamp();
        this.events = [];
        this.mouseMovements = 0;
        this.scrollDepth = 0;
        this.maxScrollDepth = 0;
        this.clickCount = 0;
        this.keystrokes = 0;
        this.focusEvents = 0;
        this.blurEvents = 0;
        this.userInteractions = [];
        this.formInteractions = [];
        this.lastActivity = Date.now();
        this.clickTimestamps = []; // לזיהוי דפוסי קליקים
        this.mouseMovementPattern = []; // לזיהוי בוטים
        this.scrollPattern = []; // לזיהוי התנהגות גלילה
        
        // נתונים חדשים לכללי הזיהוי החסרים
        this.clicksPerHour = 0;
        this.clicksPerDay = 0;
        this.rapidClicksDetected = 0;
        this.conversionEvents = []; // לחישוב conversion rate
        this.hourlyClickHistory = []; // מעקב קליקים לפי שעות
        this.dailyClickHistory = []; // מעקב קליקים לפי ימים
        
        debugLog('📊 TrackingData מתקדם אותחל', {
            sessionId: this.sessionId,
            visitStart: this.visitStart,
            isPaidTraffic: isPaidTraffic()
        });
    }
    
    TrackingData.prototype.addEvent = function(eventType, data) {
        var event = {
            type: eventType,
            timestamp: getTimestamp(),
            data: data || {}
        };
        
        this.events.push(event);
        this.lastActivity = Date.now();
        
        // שמירה על מקסימום אירועים
        if (this.events.length > CONFIG.MAX_EVENTS) {
            this.events = this.events.slice(-CONFIG.MAX_EVENTS);
        }
        
        debugLog('📝 אירוע נוסף: ' + eventType, event);
    };
    
    TrackingData.prototype.addUserInteraction = function(interaction) {
        interaction.timestamp = getTimestamp();
        this.userInteractions.push(interaction);
        this.lastActivity = Date.now();
        
        // שמירה על מקסימום אינטראקציות
        if (this.userInteractions.length > 20) {
            this.userInteractions = this.userInteractions.slice(-20);
        }
    };
    
    TrackingData.prototype.addFormInteraction = function(formData) {
        formData.timestamp = getTimestamp();
        this.formInteractions.push(formData);
        
        // שמירה על מקסימום אינטראקציות טפסים
        if (this.formInteractions.length > 10) {
            this.formInteractions = this.formInteractions.slice(-10);
        }
    };
    
    // פונקציה חדשה לרישום קליק עם ניתוח מתקדם
    TrackingData.prototype.recordClick = function(clickData) {
        var now = Date.now();
        this.clickCount++;
        this.clickTimestamps.push(now);
        
        // ניתוח קליקים מהירים (rapid_clicks)
        this.analyzeRapidClicks(now);
        
        // עדכון מונה קליקים לשעה ויום
        this.updateClickCounters(now);
        
        // שמירה על מקסימום timestamps
        if (this.clickTimestamps.length > 20) {
            this.clickTimestamps = this.clickTimestamps.slice(-20);
        }
        
        this.addUserInteraction(clickData);
        this.addEvent('click', clickData);
    };
    
    // ניתוח קליקים מהירים
    TrackingData.prototype.analyzeRapidClicks = function(currentTime) {
        if (this.clickTimestamps.length < 2) return;
        
        var lastClickTime = this.clickTimestamps[this.clickTimestamps.length - 2];
        var timeDiff = currentTime - lastClickTime;
        
        // אם הזמן בין קליקים קטן מ-500ms - זה חשוד
        if (timeDiff < 500) {
            this.rapidClicksDetected++;
            debugLog('⚡ זוהה קליק מהיר! זמן בין קליקים: ' + timeDiff + 'ms');
        }
    };
    
    // עדכון מונה קליקים לשעה ויום
    TrackingData.prototype.updateClickCounters = function(currentTime) {
        var currentHour = new Date(currentTime).getHours();
        var currentDay = new Date(currentTime).toDateString();
        
        // עדכון קליקים לשעה
        var hourData = this.hourlyClickHistory.find(function(h) { 
            return h.hour === currentHour && h.date === currentDay; 
        });
        
        if (hourData) {
            hourData.count++;
        } else {
            this.hourlyClickHistory.push({
                hour: currentHour,
                date: currentDay,
                count: 1,
                timestamp: currentTime
            });
        }
        
        // עדכון קליקים ליום
        var dayData = this.dailyClickHistory.find(function(d) { 
            return d.date === currentDay; 
        });
        
        if (dayData) {
            dayData.count++;
        } else {
            this.dailyClickHistory.push({
                date: currentDay,
                count: 1,
                timestamp: currentTime
            });
        }
        
        // ניקוי נתונים ישנים (שמירה על 24 שעות אחרונות)
        var oneDayAgo = currentTime - (24 * 60 * 60 * 1000);
        this.hourlyClickHistory = this.hourlyClickHistory.filter(function(h) {
            return h.timestamp > oneDayAgo;
        });
        
        // ניקוי נתונים ישנים (שמירה על 7 ימים אחרונים)
        var oneWeekAgo = currentTime - (7 * 24 * 60 * 60 * 1000);
        this.dailyClickHistory = this.dailyClickHistory.filter(function(d) {
            return d.timestamp > oneWeekAgo;
        });
        
        // עדכון המונים הנוכחיים
        this.clicksPerHour = this.getCurrentHourClicks();
        this.clicksPerDay = this.getCurrentDayClicks();
    };
    
    // קבלת מספר קליקים בשעה הנוכחית
    TrackingData.prototype.getCurrentHourClicks = function() {
        var now = new Date();
        var currentHour = now.getHours();
        var currentDay = now.toDateString();
        
        var hourData = this.hourlyClickHistory.find(function(h) {
            return h.hour === currentHour && h.date === currentDay;
        });
        
        return hourData ? hourData.count : 0;
    };
    
    // קבלת מספר קליקים ביום הנוכחי
    TrackingData.prototype.getCurrentDayClicks = function() {
        var currentDay = new Date().toDateString();
        
        var dayData = this.dailyClickHistory.find(function(d) {
            return d.date === currentDay;
        });
        
        return dayData ? dayData.count : 0;
    };
    
    // רישום אירוע המרה
    TrackingData.prototype.recordConversion = function(conversionType, value) {
        var conversionEvent = {
            type: conversionType,
            value: value || 0,
            timestamp: getTimestamp(),
            sessionId: this.sessionId
        };
        
        this.conversionEvents.push(conversionEvent);
        
        // שמירה על מקסימום אירועי המרה
        if (this.conversionEvents.length > 10) {
            this.conversionEvents = this.conversionEvents.slice(-10);
        }
        
        debugLog('💰 אירוע המרה נרשם: ' + conversionType, conversionEvent);
    };
    
    // חישוב conversion rate
    TrackingData.prototype.getConversionRate = function() {
        if (this.clickCount === 0) return 0;
        return (this.conversionEvents.length / this.clickCount) * 100;
    };
    
    // ניתוח קליקים מרובים בחלון זמן
    TrackingData.prototype.analyzeMultipleClicks = function(windowMinutes) {
        if (this.clickTimestamps.length < 2) return 0;
        
        var now = Date.now();
        var windowMs = windowMinutes * 60 * 1000;
        var windowStart = now - windowMs;
        
        var clicksInWindow = this.clickTimestamps.filter(function(timestamp) {
            return timestamp >= windowStart;
        });
        
        return clicksInWindow.length;
    };
    
    TrackingData.prototype.getTimeOnPage = function() {
        return Math.round((Date.now() - new Date(this.visitStart).getTime()) / 1000);
    };
    
    TrackingData.prototype.getTimeSinceLastActivity = function() {
        return Math.round((Date.now() - this.lastActivity) / 1000);
    };
    
    // חישוב מטריקות מתקדמות לזיהוי בוטים
    TrackingData.prototype.getAdvancedMetrics = function() {
        var now = Date.now();
        var timeOnPage = this.getTimeOnPage();
        
        return {
            // מטריקות בסיסיות
            time_on_page: timeOnPage,
            mouse_movements: this.mouseMovements,
            scroll_depth: this.maxScrollDepth,
            click_count: this.clickCount,
            keystrokes: this.keystrokes,
            
            // מטריקות מתקדמות
            mouse_movement_rate: timeOnPage > 0 ? this.mouseMovements / timeOnPage : 0,
            click_rate: timeOnPage > 0 ? this.clickCount / timeOnPage : 0,
            keystroke_rate: timeOnPage > 0 ? this.keystrokes / timeOnPage : 0,
            
            // דפוסי התנהגות
            click_pattern_variance: this.calculateClickPatternVariance(),
            mouse_movement_entropy: this.calculateMouseMovementEntropy(),
            scroll_behavior_score: this.calculateScrollBehaviorScore(),
            
            // מטריקות אינטראקציה
            focus_blur_ratio: this.blurEvents > 0 ? this.focusEvents / this.blurEvents : 1,
            interaction_diversity: this.calculateInteractionDiversity(),
            form_engagement_score: this.calculateFormEngagementScore(),
            
            // הכללים החדשים שהוספנו
            clicks_per_hour: this.clicksPerHour,
            clicks_per_day: this.clicksPerDay,
            rapid_clicks_detected: this.rapidClicksDetected,
            conversion_rate: this.getConversionRate(),
            multiple_clicks_5min: this.analyzeMultipleClicks(5),
            multiple_clicks_10min: this.analyzeMultipleClicks(10),
            multiple_clicks_30min: this.analyzeMultipleClicks(30)
        };
    };
    
    // חישוב שונות בדפוס קליקים (לזיהוי בוטים)
    TrackingData.prototype.calculateClickPatternVariance = function() {
        if (this.clickTimestamps.length < 2) return 1; // ערך נורמלי
        
        var intervals = [];
        for (var i = 1; i < this.clickTimestamps.length; i++) {
            intervals.push(this.clickTimestamps[i] - this.clickTimestamps[i-1]);
        }
        
        var mean = intervals.reduce(function(a, b) { return a + b; }, 0) / intervals.length;
        var variance = intervals.reduce(function(acc, val) { 
            return acc + Math.pow(val - mean, 2); 
        }, 0) / intervals.length;
        
        return Math.sqrt(variance); // סטיית תקן
    };
    
    // חישוב אנטרופיה של תנועות עכבר
    TrackingData.prototype.calculateMouseMovementEntropy = function() {
        if (this.mouseMovementPattern.length < 10) return 1; // ערך נורמלי
        
        // חישוב פשוט של אנטרופיה בהתבסס על כיוונים
        var directions = {};
        for (var i = 1; i < this.mouseMovementPattern.length; i++) {
            var prev = this.mouseMovementPattern[i-1];
            var curr = this.mouseMovementPattern[i];
            var direction = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            var bucket = Math.round(direction * 4 / Math.PI); // 8 כיוונים
            directions[bucket] = (directions[bucket] || 0) + 1;
        }
        
        var total = Object.values(directions).reduce(function(a, b) { return a + b; }, 0);
        var entropy = 0;
        for (var dir in directions) {
            var p = directions[dir] / total;
            entropy -= p * Math.log2(p);
        }
        
        return entropy;
    };
    
    // חישוב ציון התנהגות גלילה
    TrackingData.prototype.calculateScrollBehaviorScore = function() {
        if (this.scrollPattern.length < 3) return 1; // ערך נורמלי
        
        var smoothness = 0;
        var totalChange = 0;
        
        for (var i = 1; i < this.scrollPattern.length; i++) {
            var change = Math.abs(this.scrollPattern[i] - this.scrollPattern[i-1]);
            totalChange += change;
            if (change < 5) smoothness++; // גלילה חלקה
        }
        
        return smoothness / (this.scrollPattern.length - 1);
    };
    
    // חישוב גיוון אינטראקציות
    TrackingData.prototype.calculateInteractionDiversity = function() {
        var types = {};
        this.userInteractions.forEach(function(interaction) {
            types[interaction.type || 'unknown'] = true;
        });
        return Object.keys(types).length;
    };
    
    // חישוב ציון מעורבות בטפסים
    TrackingData.prototype.calculateFormEngagementScore = function() {
        if (this.formInteractions.length === 0) return 0;
        
        var totalTime = 0;
        var fieldChanges = 0;
        
        this.formInteractions.forEach(function(interaction) {
            if (interaction.type === 'focus' || interaction.type === 'input') {
                fieldChanges++;
            }
            if (interaction.duration) {
                totalTime += interaction.duration;
            }
        });
        
        return fieldChanges > 0 ? totalTime / fieldChanges : 0;
    };
    
    // 🎯 יצירת אובייקט המעקב הראשי
    var trackingData = new TrackingData();
    
    // 🖱️ מעקב מתקדם אחר תנועות עכבר
    var lastMouseMove = 0;
    
    if (CONFIG.INTERACTION_TRACKING) {
        document.addEventListener('mousemove', function(e) {
            var now = Date.now();
            if (now - lastMouseMove > CONFIG.MOUSE_TRACKING_THROTTLE) {
                trackingData.mouseMovements++;
                
                // שמירת דפוס תנועה לניתוח מתקדם
                trackingData.mouseMovementPattern.push({
                    x: e.clientX,
                    y: e.clientY,
                    timestamp: now
                });
                
                // שמירה על מקסימום נקודות
                if (trackingData.mouseMovementPattern.length > 100) {
                    trackingData.mouseMovementPattern = trackingData.mouseMovementPattern.slice(-100);
                }
                
                lastMouseMove = now;
                
                // לוג כל 50 תנועות
                if (trackingData.mouseMovements % 50 === 0) {
                    debugLog('🖱️ תנועות עכבר: ' + trackingData.mouseMovements + 
                           ' (אנטרופיה: ' + trackingData.calculateMouseMovementEntropy().toFixed(2) + ')');
                }
            }
        });
    }
    
    // 📜 מעקב מתקדם אחר גלילה
    var lastScroll = 0;
    
    window.addEventListener('scroll', function() {
        var now = Date.now();
        if (now - lastScroll > CONFIG.SCROLL_TRACKING_THROTTLE) {
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            var documentHeight = document.documentElement.scrollHeight - window.innerHeight;
            var scrollPercent = documentHeight > 0 ? Math.round((scrollTop / documentHeight) * 100) : 0;
            
            trackingData.scrollDepth = scrollPercent;
            if (scrollPercent > trackingData.maxScrollDepth) {
                trackingData.maxScrollDepth = scrollPercent;
                debugLog('📜 עומק גלילה מקסימלי: ' + trackingData.maxScrollDepth + '%');
            }
            
            // שמירת דפוס גלילה
            trackingData.scrollPattern.push(scrollPercent);
            if (trackingData.scrollPattern.length > 50) {
                trackingData.scrollPattern = trackingData.scrollPattern.slice(-50);
            }
            
            lastScroll = now;
        }
    });
    
    // 👆 מעקב מתקדם אחר קליקים
    document.addEventListener('click', function(e) {
        var now = Date.now();
        
        var clickData = {
            type: 'click',
            element: e.target.tagName.toLowerCase(),
            className: e.target.className,
            id: e.target.id,
            x: e.clientX,
            y: e.clientY,
            button: e.button,
            timestamp: now,
            pattern_variance: trackingData.calculateClickPatternVariance()
        };
        
        // שימוש בפונקציה החדשה לרישום קליק
        trackingData.recordClick(clickData);
        
        debugLog('👆 קליק #' + trackingData.clickCount + 
               ' (שונות דפוס: ' + clickData.pattern_variance.toFixed(2) + 
               ', קליקים/שעה: ' + trackingData.clicksPerHour + 
               ', קליקים מהירים: ' + trackingData.rapidClicksDetected + ')', clickData);
    });
    
    // ⌨️ מעקב אחר הקלדה
    document.addEventListener('keydown', function(e) {
        trackingData.keystrokes++;
        
        if (trackingData.keystrokes % 20 === 0) {
            debugLog('⌨️ הקלדות: ' + trackingData.keystrokes + 
                   ' (קצב: ' + (trackingData.keystrokes / trackingData.getTimeOnPage()).toFixed(2) + '/שניה)');
        }
    });
    
    // 🎯 מעקב מתקדם אחר פוקוס
    if (CONFIG.FOCUS_TRACKING) {
        window.addEventListener('focus', function() {
            trackingData.focusEvents++;
            trackingData.addEvent('window_focus');
            debugLog('🎯 חזרה לחלון (פוקוס #' + trackingData.focusEvents + ')');
        });
        
        window.addEventListener('blur', function() {
            trackingData.blurEvents++;
            trackingData.addEvent('window_blur');
            debugLog('😴 יציאה מהחלון (blur #' + trackingData.blurEvents + ')');
        });
    }
    
    // 📝 מעקב מתקדם אחר טפסים
    if (CONFIG.FORM_TRACKING) {
        // מעקב אחר פוקוס בשדות
        document.addEventListener('focusin', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                var formData = {
                    type: 'focus',
                    field_type: e.target.type || e.target.tagName.toLowerCase(),
                    field_name: e.target.name || e.target.id || 'unnamed',
                    form_id: e.target.form ? e.target.form.id : 'unknown'
                };
                
                trackingData.addFormInteraction(formData);
                debugLog('📝 פוקוס בשדה: ' + formData.field_name);
            }
        });
        
        // מעקב אחר שינויים בשדות
        document.addEventListener('input', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                var formData = {
                    type: 'input',
                    field_type: e.target.type || e.target.tagName.toLowerCase(),
                    field_name: e.target.name || e.target.id || 'unnamed',
                    value_length: e.target.value ? e.target.value.length : 0,
                    form_id: e.target.form ? e.target.form.id : 'unknown'
                };
                
                trackingData.addFormInteraction(formData);
            }
        });
        
        // מעקב אחר שליחת טפסים
        document.addEventListener('submit', function(e) {
            var formData = {
                type: 'submit',
                action: e.target.action || 'unknown',
                method: e.target.method || 'unknown',
                elements: e.target.elements.length,
                form_id: e.target.id || 'unnamed',
                engagement_score: trackingData.calculateFormEngagementScore()
            };
            
            trackingData.addFormInteraction(formData);
            trackingData.addEvent('form_submit', formData);
            
            debugLog('📝 טופס נשלח (ציון מעורבות: ' + formData.engagement_score.toFixed(2) + ')', formData);
        });
    }
    
    // 📤 שליחת נתונים מתקדמת לשרת
    function sendDataToServer(eventType) {
        // מניעת שליחה כפולה
        var now = Date.now();
        if (now - lastSentTime < DUPLICATE_PREVENTION_WINDOW && eventType !== 'page_unload') {
            debugLog('⏭️ דילוג - שליחה כפולה נמנעה (אחרי ' + Math.round((now - lastSentTime) / 1000) + ' שניות)');
            return;
        }
        
        // בדיקה אם צריך לעקוב רק אחרי תעבורה ממומנת
        if (CONFIG.ONLY_PAID_TRAFFIC && !isPaidTraffic()) {
            debugLog('⏭️ דילוג - לא תעבורה ממומנת');
            return;
        }
        
        // בדיקה של זמן מינימלי בעמוד
        if (trackingData.getTimeOnPage() < CONFIG.MIN_TIME_ON_PAGE / 1000) {
            debugLog('⏭️ דילוג - זמן קצר מדי בעמוד (נדרש: ' + (CONFIG.MIN_TIME_ON_PAGE / 1000) + ' שניות)');
            return;
        }
        
        var advancedMetrics = trackingData.getAdvancedMetrics();
        
        var payload = {
            // מידע בסיסי
            user_agent: navigator.userAgent,
            referrer: document.referrer,
            page: window.location.pathname,
            gclid: getGclid(),
            time_on_page: trackingData.getTimeOnPage(),
            visit_start: trackingData.visitStart,
            event_type: eventType,
            
            // נתוני המעקב המתקדמים
            additional_data: {
                // מידע על המכשיר
                ...getDeviceInfo(),
                
                // מידע על העמוד
                ...getPageInfo(),
                
                // נתוני האינטראקציה הבסיסיים
                session_id: trackingData.sessionId,
                scroll_depth: trackingData.scrollDepth,
                max_scroll_depth: trackingData.maxScrollDepth,
                mouse_movements: trackingData.mouseMovements,
                click_count: trackingData.clickCount,
                keystrokes: trackingData.keystrokes,
                focus_events: trackingData.focusEvents,
                blur_events: trackingData.blurEvents,
                time_since_last_activity: trackingData.getTimeSinceLastActivity(),
                
                // מטריקות מתקדמות לזיהוי בוטים
                ...advancedMetrics,
                
                // אירועים ואינטראקציות אחרונים
                recent_events: trackingData.events.slice(-10),
                user_interactions: trackingData.userInteractions.slice(-10),
                form_interactions: trackingData.formInteractions.slice(-5),
                
                // מטא-דאטה
                script_version: '2.1.0',
                integration_type: 'direct_advanced',
                timestamp: getTimestamp(),
                
                // דפוסי התנהגות לניתוח מתקדם
                click_timestamps: trackingData.clickTimestamps.slice(-10),
                scroll_pattern: trackingData.scrollPattern.slice(-10),
                mouse_movement_sample: trackingData.mouseMovementPattern.slice(-10)
            }
        };
        
        debugLog('📤 שולח נתונים מתקדמים לשרת', {
            eventType: eventType,
            timeOnPage: payload.time_on_page,
            isPaid: isPaidTraffic(),
            dataSize: JSON.stringify(payload).length,
            advancedMetrics: advancedMetrics
        });
        
        // שליחה עם fetch
        if (typeof fetch !== 'undefined') {
            fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                // עדכון זמן שליחה אחרון אחרי הצלחה
                lastSentTime = now;
                
                debugLog('✅ תגובת שרת', data);
                
                // הודעות מפורטות על התגובה
                if (data.suspicious && isPaidTraffic()) {
                    debugLog('⚠️ השרת זיהה קליק ממומן חשוד!', data.reasons || 'לא צוינו סיבות');
                } else if (data.suspicious && !isPaidTraffic()) {
                    debugLog('⚠️ השרת זיהה קליק אורגני חשוד (לא יחסם)', data.reasons || 'לא צוינו סיבות');
                }
                
                if (data.blocked) {
                    debugLog('🚫 השרת חסם את הבקשה!', data.reasons || 'לא צוינו סיבות');
                }
                
                if (data.tracked && !data.suspicious) {
                    debugLog('✅ קליק נרשם בהצלחה ללא חשד');
                }
            })
            .catch(function(error) {
                debugLog('❌ שגיאה בשליחה', error.message);
            });
        } else {
            debugLog('❌ fetch לא נתמך בדפדפן זה');
        }
    }
    
    // 🚀 אתחול המערכת
    function initializeFraudDetection() {
        debugLog('🚀 מאתחל מערכת הגנה מתקדמת מפני קליקים מזויפים');
        debugLog('⚙️ הגדרות', CONFIG);
        debugLog('🌐 מידע על העמוד', getPageInfo());
        debugLog('📱 מידע על המכשיר', getDeviceInfo());
        
        var trafficType = isPaidTraffic() ? 'ממומנת (gclid: ' + getGclid() + ')' : 'אורגנית';
        debugLog('🎯 סוג תעבורה: ' + trafficType);
        debugLog('🛡️ לוגיקת חסימה: רק קליקים ממומנים חשודים יחסמו');
        
        // שליחת נתונים ראשונית
        trackingData.addEvent('page_load');
        
        // המתנה קצרה ואז שליחה ראשונית
        setTimeout(function() {
            sendDataToServer('pageview');
        }, 1000);
        
        // שליחה תקופתית
        setInterval(function() {
            sendDataToServer('periodic');
        }, CONFIG.SEND_INTERVAL);
        
        // שליחה לפני יציאה מהעמוד
        window.addEventListener('beforeunload', function() {
            sendDataToServer('page_unload');
        });
        
        debugLog('✅ מערכת הגנה מתקדמת הופעלה בהצלחה!');
    }
    
    // 🎬 הפעלת המערכת
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFraudDetection);
    } else {
        initializeFraudDetection();
    }
    
    // 🌍 חשיפה גלובלית לדיבוג ובקרה
    if (CONFIG.DEBUG_MODE) {
        window.FraudDetection = {
            trackingData: trackingData,
            sendData: sendDataToServer,
            config: CONFIG,
            getStats: function() {
                return {
                    sessionId: trackingData.sessionId,
                    timeOnPage: trackingData.getTimeOnPage(),
                    mouseMovements: trackingData.mouseMovements,
                    scrollDepth: trackingData.maxScrollDepth,
                    clickCount: trackingData.clickCount,
                    keystrokes: trackingData.keystrokes,
                    eventsCount: trackingData.events.length,
                    isPaidTraffic: isPaidTraffic(),
                    advancedMetrics: trackingData.getAdvancedMetrics()
                };
            },
            getAdvancedStats: function() {
                return {
                    basicStats: this.getStats(),
                    behaviorPatterns: {
                        clickPatternVariance: trackingData.calculateClickPatternVariance(),
                        mouseMovementEntropy: trackingData.calculateMouseMovementEntropy(),
                        scrollBehaviorScore: trackingData.calculateScrollBehaviorScore(),
                        interactionDiversity: trackingData.calculateInteractionDiversity(),
                        formEngagementScore: trackingData.calculateFormEngagementScore()
                    },
                    recentActivity: {
                        events: trackingData.events.slice(-5),
                        interactions: trackingData.userInteractions.slice(-5),
                        formInteractions: trackingData.formInteractions.slice(-3)
                    },
                    // נתונים חדשים לכללי הזיהוי
                    detectionMetrics: {
                        clicksPerHour: trackingData.clicksPerHour,
                        clicksPerDay: trackingData.clicksPerDay,
                        rapidClicksDetected: trackingData.rapidClicksDetected,
                        conversionRate: trackingData.getConversionRate(),
                        multipleClicks5min: trackingData.analyzeMultipleClicks(5),
                        multipleClicks10min: trackingData.analyzeMultipleClicks(10),
                        multipleClicks30min: trackingData.analyzeMultipleClicks(30),
                        conversionEvents: trackingData.conversionEvents
                    }
                };
            },
            // פונקציות חדשות לרישום המרות
            recordConversion: function(type, value) {
                trackingData.recordConversion(type, value);
                debugLog('💰 המרה נרשמה: ' + type + ' (ערך: ' + (value || 0) + ')');
            },
            recordPurchase: function(amount) {
                this.recordConversion('purchase', amount);
            },
            recordSignup: function() {
                this.recordConversion('signup', 1);
            },
            recordFormSubmit: function(formName) {
                this.recordConversion('form_submit_' + formName, 1);
            },
            // בדיקת כללי זיהוי
            checkDetectionRules: function() {
                var metrics = trackingData.getAdvancedMetrics();
                var warnings = [];
                
                if (metrics.rapid_clicks_detected > 3) {
                    warnings.push('זוהו קליקים מהירים חשודים: ' + metrics.rapid_clicks_detected);
                }
                
                if (metrics.clicks_per_hour > 50) {
                    warnings.push('מספר קליקים גבוה לשעה: ' + metrics.clicks_per_hour);
                }
                
                if (metrics.clicks_per_day > 200) {
                    warnings.push('מספר קליקים גבוה ליום: ' + metrics.clicks_per_day);
                }
                
                if (metrics.multiple_clicks_5min > 10) {
                    warnings.push('קליקים מרובים ב-5 דקות: ' + metrics.multiple_clicks_5min);
                }
                
                if (metrics.click_pattern_variance < 100) {
                    warnings.push('דפוס קליקים חשוד (שונות נמוכה): ' + metrics.click_pattern_variance.toFixed(2));
                }
                
                return {
                    suspicious: warnings.length > 0,
                    warnings: warnings,
                    metrics: metrics
                };
            }
        };
        
        debugLog('🔧 מצב דיבוג מתקדם פעיל - גש ל-window.FraudDetection לפקודות');
        debugLog('📊 פקודות זמינות: getStats(), getAdvancedStats(), recordConversion(type, value), checkDetectionRules()');
        debugLog('💰 דוגמאות המרה: recordPurchase(100), recordSignup(), recordFormSubmit("contact")');
    }
    
})(); 
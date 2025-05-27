// סקריפט מעקב מעודכן להטמעה ב-Google Tag Manager
// זיהוי וחסימה של קליקים מזויפים - רק מתעבורה ממומנת
(function() {
    'use strict';
    
    // הגדרות מותאמות לפרויקט הגנת קליקים מזויפים
    const CONFIG = {
        serverUrl: 'https://click-fraud-backend.vercel.app/api/track', // ✅ דומיין פרודקשן
        debug: false, // שנה ל-true לדיבאג
        timeout: 5000, // זמן המתנה לתגובה מהשרת (מילישניות)
        trackingEnabled: true, // ניתן לכיבוי/הפעלה מ-GTM
        onlyPaidTraffic: true // עוקב רק אחרי תעבורה ממומנת (עם gclid)
    };
    
    // בדיקה אם זה תעבורה ממומנת (יש gclid)
    function isPaidTraffic() {
        const urlParams = new URLSearchParams(window.location.search);
        return !!urlParams.get('gclid');
    }
    
    // פונקציה לאיסוף נתוני משתמש מותאמת לשרת
    function collectUserData() {
        const now = new Date();
        const urlParams = new URLSearchParams(window.location.search);
        
        return {
            // נתונים שהשרת שלך מצפה להם
            ip: null, // השרת ימלא אוטומטית
            user_agent: navigator.userAgent,
            referrer: document.referrer || '',
            page: window.location.pathname,
            gclid: urlParams.get('gclid'),
            time_on_page: getTimeOnPage(),
            visit_start: getSessionStartTime(),
            additional_data: {
                // נתונים נוספים לניתוח
                screen_width: window.innerWidth,
                screen_height: window.innerHeight,
                language: navigator.language,
                platform: navigator.platform,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                url: window.location.href,
                title: document.title,
                session_id: getOrCreateSessionId(),
                scroll_depth: getScrollDepth(),
                mouse_movements: getMouseMovements(),
                user_interactions: getUserInteractions()
            }
        };
    }
    
    // יצירת/קבלת מזהה סשן
    function getOrCreateSessionId() {
        let sessionId = sessionStorage.getItem('fraud_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('fraud_session_id', sessionId);
        }
        return sessionId;
    }
    
    // משתנים לעקיבה
    let sessionStartTime = Date.now();
    let mouseMovementCount = 0;
    let userInteractions = [];
    let scrollDepth = 0;
    
    // יצירת/קבלת מזהה סשן
    function getOrCreateSessionId() {
        let sessionId = sessionStorage.getItem('fraud_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('fraud_session_id', sessionId);
        }
        return sessionId;
    }
    
    // זמן בדף בשניות
    function getTimeOnPage() {
        return Math.floor((Date.now() - sessionStartTime) / 1000);
    }
    
    // זמן התחלת הסשן
    function getSessionStartTime() {
        return new Date(sessionStartTime).toISOString();
    }
    
    // ספירת תנועות עכבר
    function getMouseMovements() {
        return mouseMovementCount;
    }
    
    // עומק גלילה
    function getScrollDepth() {
        return scrollDepth;
    }
    
    // אינטראקציות משתמש
    function getUserInteractions() {
        return userInteractions.slice(-10); // רק 10 האחרונות
    }
    
    // פונקציה לשליחת נתונים לשרת (מותאמת לשרת שלך)
    async function sendDataToServer() {
        // בדיקה אם עקיבה מופעלת
        if (!CONFIG.trackingEnabled) return;
        
        // בדיקה אם זה תעבורה ממומנת
        if (CONFIG.onlyPaidTraffic && !isPaidTraffic()) {
            if (CONFIG.debug) {
                console.log('Fraud Detection: Not paid traffic (no gclid), skipping tracking');
            }
            return;
        }
        
        const userData = collectUserData();
        
        if (CONFIG.debug) {
            console.log('Fraud Detection: Sending data to server:', userData);
        }
        
        try {
            const response = await fetch(CONFIG.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
                signal: AbortSignal.timeout(CONFIG.timeout)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (CONFIG.debug) {
                console.log('Fraud Detection: Server response:', result);
            }
            
            // שליחת אירועים ל-GTM DataLayer
            if (typeof dataLayer !== 'undefined') {
                dataLayer.push({
                    'event': 'fraud_detection_data_sent',
                    'fraud_session_id': userData.additional_data.session_id,
                    'fraud_gclid': userData.gclid,
                    'fraud_time_on_page': userData.time_on_page
                });
            }
            
            return result;
            
        } catch (error) {
            if (CONFIG.debug) {
                console.warn('Fraud Detection error:', error);
            }
            
            // שליחת אירוע שגיאה ל-GTM
            if (typeof dataLayer !== 'undefined') {
                dataLayer.push({
                    'event': 'fraud_detection_error',
                    'fraud_error_message': error.message
                });
            }
            
            return null;
        }
    }
    
    // הגדרת מאזיני אירועים לעקיבה
    function setupEventListeners() {
        // מעקב אחר תנועות עכבר
        document.addEventListener('mousemove', function() {
            mouseMovementCount++;
        });
        
        // מעקב אחר גלילה
        window.addEventListener('scroll', function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const bodyHeight = document.documentElement.scrollHeight;
            const currentScrollDepth = Math.round((scrollTop + windowHeight) / bodyHeight * 100);
            
            if (currentScrollDepth > scrollDepth) {
                scrollDepth = currentScrollDepth;
            }
        });
        
        // מעקב אחר קליקים
        document.addEventListener('click', function(e) {
            userInteractions.push({
                type: 'click',
                element: e.target.tagName,
                timestamp: Date.now()
            });
        });
        
        // מעקב אחר אינטראקציות עם טפסים
        document.addEventListener('input', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                userInteractions.push({
                    type: 'form_input',
                    element: e.target.tagName,
                    timestamp: Date.now()
                });
            }
        });
    }
    
    // תזמוני שליחה מתכווננים
    function scheduleDataSending() {
        // שליחה מיידית בטעינת הדף (רק לתעבורה ממומנת)
        if (isPaidTraffic()) {
            // שליחה מיידית
            setTimeout(() => sendDataToServer(), 1000);
            
            // שליחה נוספת אחרי 10 שניות (לעקיבת התנהגות)
            setTimeout(() => sendDataToServer(), 10000);
            
            // שליחה תקופתית כל 30 שניות (אם יש פעילות)
            setInterval(() => {
                if (getTimeOnPage() > 5) { // רק אם המשתמש נשאר יותר מ-5 שניות
                    sendDataToServer();
                }
            }, 30000);
        }
        
        // שליחה ביציאה מהדף
        window.addEventListener('beforeunload', function() {
            if (isPaidTraffic()) {
                // שליחה סינכרונית ביציאה
                navigator.sendBeacon(CONFIG.serverUrl, JSON.stringify(collectUserData()));
            }
        });
    }
    
    // אתחול המערכת
    function initializeFraudDetection() {
        if (CONFIG.debug) {
            console.log('Fraud Detection: Initializing system');
            console.log('Fraud Detection: Paid traffic detected:', isPaidTraffic());
            console.log('Fraud Detection: GCLID:', new URLSearchParams(window.location.search).get('gclid'));
        }
        
        // הגדרת מאזיני אירועים
        setupEventListeners();
        
        // תזמון שליחת נתונים
        scheduleDataSending();
        
        // שליחת אירוע התחלתי ל-GTM DataLayer
        if (typeof dataLayer !== 'undefined') {
            dataLayer.push({
                'event': 'fraud_detection_initialized',
                'fraud_session_id': getOrCreateSessionId(),
                'fraud_paid_traffic': isPaidTraffic(),
                'fraud_gclid': new URLSearchParams(window.location.search).get('gclid')
            });
        }
        
        if (CONFIG.debug) {
            console.log('Fraud Detection: System initialized successfully');
        }
    }
    
    // הפעלה כאשר הדף נטען
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFraudDetection);
    } else {
        initializeFraudDetection();
    }
    
})();
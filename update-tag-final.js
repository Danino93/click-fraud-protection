const GTMManager = require('./gtm-manager');

async function updateTagWithNewCode() {
    try {
        console.log('🔄 מעדכן תג GTM עם הקוד החדש...');
        
        const gtm = new GTMManager();
        
        // הקוד החדש עם הדומיין המעודכן
        const newCode = `// GTM Fraud Detection - Final Version
// תחביר ES5 תואם GTM + דומיין פרודקשן
(function() {
    'use strict';
    
    // הגדרות מותאמות לפרויקט הגנת קליקים מזויפים
    var CONFIG = {
        serverUrl: 'https://click-fraud-backend.vercel.app/api/track',
        debug: true, // מופעל לבדיקה
        timeout: 5000,
        trackingEnabled: true,
        onlyPaidTraffic: false // עוקב אחרי כל התעבורה
    };
    
    // בדיקה אם זה תעבורה ממומנת (יש gclid)
    function isPaidTraffic() {
        var urlParams = new URLSearchParams(window.location.search);
        return !!urlParams.get('gclid');
    }
    
    // משתנים לעקיבה
    var sessionStartTime = Date.now();
    var mouseMovementCount = 0;
    var userInteractions = [];
    var scrollDepth = 0;
    
    // יצירת/קבלת מזהה סשן
    function getOrCreateSessionId() {
        var sessionId = sessionStorage.getItem('fraud_session_id');
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
        return userInteractions.slice(-10);
    }
    
    // פונקציה לאיסוף נתוני משתמש
    function collectUserData() {
        var urlParams = new URLSearchParams(window.location.search);
        
        return {
            user_agent: navigator.userAgent,
            referrer: document.referrer || '',
            page: window.location.pathname,
            gclid: urlParams.get('gclid'),
            time_on_page: getTimeOnPage(),
            visit_start: getSessionStartTime(),
            event_type: 'pageview',
            additional_data: {
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
    
    // פונקציה לשליחת נתונים לשרת
    function sendDataToServer() {
        if (!CONFIG.trackingEnabled) return;
        
        // בדיקה אם זה תעבורה ממומנת (רק אם onlyPaidTraffic מופעל)
        if (CONFIG.onlyPaidTraffic && !isPaidTraffic()) {
            if (CONFIG.debug) {
                console.log('Fraud Detection: Not paid traffic, skipping');
            }
            return;
        }
        
        var userData = collectUserData();
        
        if (CONFIG.debug) {
            console.log('Fraud Detection: Sending data:', userData);
        }
        
        // יצירת XMLHttpRequest (תואם יותר מ-fetch)
        var xhr = new XMLHttpRequest();
        xhr.open('POST', CONFIG.serverUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = CONFIG.timeout;
        
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var result = JSON.parse(xhr.responseText);
                    if (CONFIG.debug) {
                        console.log('Fraud Detection: Server response:', result);
                    }
                    
                    // שליחת אירועים ל-GTM DataLayer
                    if (typeof dataLayer !== 'undefined') {
                        dataLayer.push({
                            'event': 'fraud_detection_data_sent',
                            'fraud_session_id': userData.additional_data.session_id,
                            'fraud_gclid': userData.gclid,
                            'fraud_time_on_page': userData.time_on_page,
                            'fraud_suspicious': result.suspicious || false
                        });
                    }
                } catch (e) {
                    if (CONFIG.debug) {
                        console.error('Fraud Detection: Error parsing response:', e);
                    }
                }
            } else {
                if (CONFIG.debug) {
                    console.error('Fraud Detection: HTTP error:', xhr.status);
                }
            }
        };
        
        xhr.onerror = function() {
            if (CONFIG.debug) {
                console.error('Fraud Detection: Network error');
            }
            
            if (typeof dataLayer !== 'undefined') {
                dataLayer.push({
                    'event': 'fraud_detection_error',
                    'fraud_error_message': 'Network error'
                });
            }
        };
        
        xhr.ontimeout = function() {
            if (CONFIG.debug) {
                console.error('Fraud Detection: Request timeout');
            }
        };
        
        xhr.send(JSON.stringify(userData));
    }
    
    // הגדרת מאזיני אירועים
    function setupEventListeners() {
        // מעקב אחר תנועות עכבר
        document.addEventListener('mousemove', function() {
            mouseMovementCount++;
        });
        
        // מעקב אחר גלילה
        window.addEventListener('scroll', function() {
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            var windowHeight = window.innerHeight;
            var bodyHeight = document.documentElement.scrollHeight;
            var currentScrollDepth = Math.round((scrollTop + windowHeight) / bodyHeight * 100);
            
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
    
    // תזמוני שליחה
    function scheduleDataSending() {
        // שליחה מיידית
        setTimeout(function() {
            sendDataToServer();
        }, 1000);
        
        // שליחה נוספת אחרי 10 שניות
        setTimeout(function() {
            sendDataToServer();
        }, 10000);
        
        // שליחה תקופתית כל 30 שניות
        setInterval(function() {
            if (getTimeOnPage() > 5) {
                sendDataToServer();
            }
        }, 30000);
        
        // שליחה ביציאה מהדף
        window.addEventListener('beforeunload', function() {
            navigator.sendBeacon(CONFIG.serverUrl, JSON.stringify(collectUserData()));
        });
    }
    
    // אתחול המערכת
    function initializeFraudDetection() {
        if (CONFIG.debug) {
            console.log('Fraud Detection: Initializing system');
            console.log('Fraud Detection: Paid traffic:', isPaidTraffic());
            console.log('Fraud Detection: GCLID:', new URLSearchParams(window.location.search).get('gclid'));
        }
        
        setupEventListeners();
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
    
})();`;

        console.log('🔄 מעדכן תג 17...');
        
        // עדכון התג עם הקוד החדש
        const result = await gtm.updateTag('17', {
            name: 'Fraud Detection - Production Ready',
            type: 'html',
            parameter: [
                {
                    type: 'template',
                    key: 'html',
                    value: `<script>\n${newCode}\n</script>`
                },
                {
                    type: 'boolean',
                    key: 'supportDocumentWrite',
                    value: 'false'
                }
            ],
            firingTriggerId: ['2147479553'], // All Pages trigger
            tagFiringOption: 'oncePerEvent'
        });
        
        if (result) {
            console.log('✅ התג עודכן בהצלחה!');
            console.log('📋 שם התג:', result.name);
            console.log('📋 ID התג:', result.tagId);
            
            // פרסום השינויים
            console.log('🚀 מפרסם שינויים...');
            const publishResult = await gtm.publishChanges('עדכון דומיין לפרודקשן - click-fraud-backend.vercel.app');
            
            if (publishResult && publishResult.containerVersion) {
                console.log('✅ השינויים פורסמו בהצלחה!');
                console.log('📋 גרסה חדשה:', publishResult.containerVersion.containerVersionId);
                console.log('🎉 התג מוכן לשימוש עם הדומיין החדש!');
            } else {
                console.log('⚠️ יש בעיה בפרסום השינויים');
            }
        } else {
            console.log('❌ לא הצלחנו לעדכן את התג');
        }
        
    } catch (error) {
        console.error('❌ שגיאה בעדכון התג:', error.message);
        if (error.stack) {
            console.error('📋 פרטי השגיאה:', error.stack);
        }
    }
}

updateTagWithNewCode(); 
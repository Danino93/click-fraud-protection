// tracking-script.js - מתוקן
// סקריפט לזיהוי קליקים ומעקב אחר התנהגות המשתמש
// צריך להטמיע את הסקריפט הזה בכל דפי האתר

(function() {
    // 🔧 שנה את הכתובת הזאת לכתובת השרת שלך!
    const SERVER_URL = 'https://click-fraud-backend.vercel.app/api'; // ✅ דומיין פרודקשן
    
    // קבלת פרמטרים מה-URL
    const urlParams = new URLSearchParams(window.location.search);
    const gclid = urlParams.get('gclid'); // מזהה הקליק מגוגל אדס
    
    // ערכי מעקב
    let visitStart = new Date();
    let lastActivity = new Date();
    let mouseMovements = 0;
    let scrollDepth = 0;
    let clickedElements = [];
    let formInteractions = [];
    
    console.log('🛡️ Fraud protection tracking initialized', { 
        gclid, 
        page: window.location.pathname,
        server: SERVER_URL 
    });
    
    // פונקציה לשליחת נתוני המעקב לשרת
    function sendTrackingData(eventType = 'pageview', additionalData = {}) {
        console.log('📤 Sending tracking data:', eventType);
        
        // חישוב זמן שהייה בדף
        const timeOnPage = Math.floor((new Date() - visitStart) / 1000); // בשניות
        
        // איסוף מידע בסיסי
        const trackingData = {
            user_agent: navigator.userAgent,
            referrer: document.referrer || '',
            page: window.location.pathname,
            gclid: gclid,
            time_on_page: timeOnPage,
            visit_start: visitStart.toISOString(),
            event_type: eventType,
            additional_data: {
                ...additionalData,
                screen_width: window.innerWidth,
                screen_height: window.innerHeight,
                scroll_depth: scrollDepth,
                mouse_movements: mouseMovements,
                clicked_elements: clickedElements.slice(-10), // רק 10 האחרונים
                form_interactions: formInteractions.slice(-5), // רק 5 האחרונים
                url: window.location.href,
                title: document.title,
                language: navigator.language,
                platform: navigator.platform,
                session_id: getSessionId(),
                timestamp: new Date().toISOString()
            }
        };
        
        console.log('📊 Tracking data:', {
            event_type: trackingData.event_type,
            page: trackingData.page,
            time_on_page: trackingData.time_on_page,
            gclid: trackingData.gclid,
            mouse_movements: trackingData.additional_data.mouse_movements
        });
        
        // שליחת הנתונים לשרת
        fetch(`${SERVER_URL}/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(trackingData),
        })
        .then(response => {
            if (!response.ok) {
                console.error('❌ Error sending tracking data - status:', response.status);
                return response.text().then(text => {
                    console.error('Response text:', text);
                    throw new Error(`HTTP ${response.status}: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data) {
                console.log('✅ Tracking data sent successfully:', {
                    success: data.success,
                    tracked: data.tracked,
                    suspicious: data.suspicious
                });
                
                if (data.suspicious) {
                    console.warn('⚠️ This click was marked as suspicious!');
                }
            }
        })
        .catch(error => {
            console.error('❌ Error sending tracking data:', error);
        });
    }
    
    // יצירת session ID ייחודי
    function getSessionId() {
        let sessionId = sessionStorage.getItem('fraud_protection_session');
        if (!sessionId) {
            sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('fraud_protection_session', sessionId);
        }
        return sessionId;
    }
    
    // מעקב אחר תנועות עכבר
    document.addEventListener('mousemove', function() {
        mouseMovements++;
        lastActivity = new Date();
    });
    
    // מעקב אחר גלילה
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        const documentHeight = Math.max(
            document.body.scrollHeight || 0,
            document.body.offsetHeight || 0,
            document.documentElement.clientHeight || 0,
            document.documentElement.scrollHeight || 0,
            document.documentElement.offsetHeight || 0
        );
        
        // מניעת חלוקה באפס
        if (documentHeight > window.innerHeight) {
            // חישוב אחוז הגלילה
            const newScrollDepth = Math.floor((scrollPosition / (documentHeight - window.innerHeight)) * 100);
            
            // עדכון רק אם השתנה משמעותית
            if (newScrollDepth > scrollDepth + 10) {
                scrollDepth = Math.min(newScrollDepth, 100); // מקסימום 100%
                lastActivity = new Date();
            }
        }
    });
    
    // מעקב אחר לחיצות
    document.addEventListener('click', function(e) {
        lastActivity = new Date();
        
        // שמירת פרטי האלמנט שנלחץ
        const element = e.target;
        const elementInfo = {
            tag: element.tagName,
            id: element.id || '',
            class: element.className || '',
            text: element.innerText ? element.innerText.substring(0, 50) : '',
            link: element.href || '',
            timestamp: new Date().toISOString()
        };
        
        clickedElements.push(elementInfo);
        
        // שליחת מידע על כל קליק חשוב
        if (element.tagName === 'A' || element.tagName === 'BUTTON' || 
            element.closest('a') || element.closest('button')) {
            sendTrackingData('click', { clicked: elementInfo });
        }
        
        // אם לחצו על מספר טלפון (לינק עם tel:)
        if (element.tagName === 'A' && element.href && element.href.startsWith('tel:')) {
            sendTrackingData('phone_click', { 
                phone: element.href.replace('tel:', ''),
                element: elementInfo 
            });
        }
    });
    
    // מעקב אחר אינטראקציה עם טפסים
    document.addEventListener('input', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || 
            e.target.tagName === 'SELECT') {
            lastActivity = new Date();
            
            const formElement = e.target.closest('form');
            const formId = formElement ? (formElement.id || 'unknown_form') : 'no_form';
            
            formInteractions.push({
                form_id: formId,
                field_type: e.target.type || 'unknown',
                field_name: e.target.name || 'unnamed',
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // מעקב אחר שליחת טפסים
    document.addEventListener('submit', function(e) {
        lastActivity = new Date();
        
        const form = e.target;
        const formId = form.id || 'unknown_form';
        
        sendTrackingData('form_submit', { 
            form_id: formId,
            form_action: form.action || '',
            form_fields: Array.from(form.elements)
                .filter(el => el.name)
                .map(el => ({
                    name: el.name,
                    type: el.type || 'unknown',
                    has_value: !!el.value
                }))
        });
    });
    
    // שליחת נתונים כשהדף נטען
    window.addEventListener('load', function() {
        console.log('📄 Page loaded, sending pageview');
        sendTrackingData('pageview');
    });
    
    // שליחת נתונים כשהמשתמש עוזב את הדף
    window.addEventListener('beforeunload', function() {
        // שליחה סינכרונית לוידוא שהנתונים נשלחים
        navigator.sendBeacon(`${SERVER_URL}/track`, JSON.stringify({
            user_agent: navigator.userAgent,
            referrer: document.referrer || '',
            page: window.location.pathname,
            gclid: gclid,
            time_on_page: Math.floor((new Date() - visitStart) / 1000),
            visit_start: visitStart.toISOString(),
            event_type: 'exit',
            additional_data: {
                scroll_depth: scrollDepth,
                mouse_movements: mouseMovements,
                session_id: getSessionId()
            }
        }));
    });
    
    // שליחה תקופתית של נתוני מעקב (כל 30 שניות)
    setInterval(function() {
        // שליחה רק אם המשתמש עדיין פעיל
        const inactiveTime = (new Date() - lastActivity) / 1000;
        if (inactiveTime < 300) { // פחות מ-5 דקות של חוסר פעילות
            sendTrackingData('heartbeat');
        }
    }, 30000);
    
    // שליחת pageview מיידית אם הדף כבר נטען
    if (document.readyState === 'complete') {
        console.log('📄 Page already loaded, sending immediate pageview');
        setTimeout(() => sendTrackingData('pageview'), 1000);
    }
    
})();
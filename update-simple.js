const GTMManager = require('./gtm-manager');

async function updateTag() {
    const gtm = new GTMManager();
    
    const newCode = `<script>
// GTM Fraud Detection - Production Ready
(function() {
    'use strict';
    
    var CONFIG = {
        serverUrl: 'https://click-fraud-backend.vercel.app/api/track',
        debug: true,
        timeout: 5000,
        trackingEnabled: true,
        onlyPaidTraffic: false
    };
    
    function isPaidTraffic() {
        var urlParams = new URLSearchParams(window.location.search);
        return !!urlParams.get('gclid');
    }
    
    var sessionStartTime = Date.now();
    var mouseMovementCount = 0;
    var userInteractions = [];
    var scrollDepth = 0;
    
    function getOrCreateSessionId() {
        var sessionId = sessionStorage.getItem('fraud_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('fraud_session_id', sessionId);
        }
        return sessionId;
    }
    
    function getTimeOnPage() {
        return Math.floor((Date.now() - sessionStartTime) / 1000);
    }
    
    function collectUserData() {
        var urlParams = new URLSearchParams(window.location.search);
        
        return {
            user_agent: navigator.userAgent,
            referrer: document.referrer || '',
            page: window.location.pathname,
            gclid: urlParams.get('gclid'),
            time_on_page: getTimeOnPage(),
            visit_start: new Date(sessionStartTime).toISOString(),
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
                scroll_depth: scrollDepth,
                mouse_movements: mouseMovementCount,
                user_interactions: userInteractions.slice(-10)
            }
        };
    }
    
    function sendDataToServer() {
        if (!CONFIG.trackingEnabled) return;
        
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
        };
        
        xhr.send(JSON.stringify(userData));
    }
    
    function setupEventListeners() {
        document.addEventListener('mousemove', function() {
            mouseMovementCount++;
        });
        
        window.addEventListener('scroll', function() {
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            var windowHeight = window.innerHeight;
            var bodyHeight = document.documentElement.scrollHeight;
            var currentScrollDepth = Math.round((scrollTop + windowHeight) / bodyHeight * 100);
            
            if (currentScrollDepth > scrollDepth) {
                scrollDepth = currentScrollDepth;
            }
        });
        
        document.addEventListener('click', function(e) {
            userInteractions.push({
                type: 'click',
                element: e.target.tagName,
                timestamp: Date.now()
            });
        });
    }
    
    function scheduleDataSending() {
        setTimeout(function() {
            sendDataToServer();
        }, 1000);
        
        setTimeout(function() {
            sendDataToServer();
        }, 10000);
        
        setInterval(function() {
            if (getTimeOnPage() > 5) {
                sendDataToServer();
            }
        }, 30000);
        
        window.addEventListener('beforeunload', function() {
            navigator.sendBeacon(CONFIG.serverUrl, JSON.stringify(collectUserData()));
        });
    }
    
    function initializeFraudDetection() {
        if (CONFIG.debug) {
            console.log('Fraud Detection: Initializing system');
            console.log('Fraud Detection: Paid traffic:', isPaidTraffic());
            console.log('Fraud Detection: GCLID:', new URLSearchParams(window.location.search).get('gclid'));
        }
        
        setupEventListeners();
        scheduleDataSending();
        
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
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFraudDetection);
    } else {
        initializeFraudDetection();
    }
    
})();
</script>`;

    try {
        console.log('🔄 מעדכן תג 17 עם דומיין חדש...');
        
        const result = await gtm.updateTag('17', {
            name: 'Fraud Detection - Production Ready',
            type: 'html',
            parameter: [
                {
                    type: 'template',
                    key: 'html',
                    value: newCode
                },
                {
                    type: 'boolean',
                    key: 'supportDocumentWrite',
                    value: 'false'
                }
            ],
            firingTriggerId: ['2147479553'],
            tagFiringOption: 'oncePerEvent'
        });
        
        console.log('✅ התג עודכן!');
        
        console.log('🚀 מפרסם שינויים...');
        await gtm.publishChanges('עדכון דומיין לפרודקשן');
        console.log('✅ פורסם בהצלחה!');
        
    } catch (error) {
        console.log('❌ שגיאה:', error.message);
    }
}

updateTag(); 
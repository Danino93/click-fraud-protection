// Fraud Detection Script - Final Version for Vercel
(function() {
    // Configuration
    var config = {
        apiUrl: 'https://click-fraud-backend.vercel.app/api/track',
        onlyPaidTraffic: false, // Track all traffic
        debug: true, // Enable debug mode
        batchSize: 10,
        sendInterval: 30000 // 30 seconds
    };

    // Debug logging
    function debugLog(message, data) {
        if (config.debug) {
            console.log('[Fraud Detection] ' + message, data || '');
        }
    }

    debugLog('🚀 Fraud Detection Script Started');

    // Session management
    function getOrCreateSessionId() {
        var sessionId = sessionStorage.getItem('fraud_detection_session');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('fraud_detection_session', sessionId);
        }
        return sessionId;
    }

    // Data collection
    var trackingData = {
        sessionId: getOrCreateSessionId(),
        visitStart: new Date().toISOString(),
        events: [],
        mouseMovements: 0,
        scrollDepth: 0,
        userInteractions: []
    };

    debugLog('📊 Session ID:', trackingData.sessionId);

    // Mouse movement tracking
    var lastMouseMove = 0;
    document.addEventListener('mousemove', function() {
        var now = Date.now();
        if (now - lastMouseMove > 100) { // Throttle to every 100ms
            trackingData.mouseMovements++;
            lastMouseMove = now;
        }
    });

    // Scroll tracking
    var maxScroll = 0;
    window.addEventListener('scroll', function() {
        var scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        if (scrollPercent > maxScroll) {
            maxScroll = scrollPercent;
            trackingData.scrollDepth = maxScroll;
        }
    });

    // Click tracking
    document.addEventListener('click', function(e) {
        var clickData = {
            timestamp: new Date().toISOString(),
            element: e.target.tagName,
            x: e.clientX,
            y: e.clientY
        };
        trackingData.userInteractions.push(clickData);
        debugLog('👆 Click tracked:', clickData);
    });

    // Form submission tracking
    document.addEventListener('submit', function(e) {
        var formData = {
            timestamp: new Date().toISOString(),
            type: 'form_submit',
            action: e.target.action || 'unknown'
        };
        trackingData.userInteractions.push(formData);
        debugLog('📝 Form submit tracked:', formData);
    });

    // Get URL parameters
    function getUrlParameter(name) {
        var urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // Send data to server
    function sendTrackingData(eventType) {
        var gclid = getUrlParameter('gclid');
        var timeOnPage = Math.round((Date.now() - new Date(trackingData.visitStart).getTime()) / 1000);

        var payload = {
            user_agent: navigator.userAgent,
            referrer: document.referrer,
            page: window.location.pathname,
            gclid: gclid,
            time_on_page: timeOnPage,
            visit_start: trackingData.visitStart,
            event_type: eventType,
            additional_data: {
                screen_width: screen.width,
                screen_height: screen.height,
                language: navigator.language,
                platform: navigator.platform,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                url: window.location.href,
                title: document.title,
                session_id: trackingData.sessionId,
                scroll_depth: trackingData.scrollDepth,
                mouse_movements: trackingData.mouseMovements,
                user_interactions: trackingData.userInteractions.slice(-10) // Last 10 interactions
            }
        };

        debugLog('📤 Sending data:', payload);

        // Send via fetch
        if (typeof fetch !== 'undefined') {
            fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }).then(function(response) {
                return response.json();
            }).then(function(data) {
                debugLog('✅ Server response:', data);
            }).catch(function(error) {
                debugLog('❌ Error sending data:', error);
            });
        } else {
            // Fallback for older browsers
            var xhr = new XMLHttpRequest();
            xhr.open('POST', config.apiUrl, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        debugLog('✅ Server response:', xhr.responseText);
                    } else {
                        debugLog('❌ Error sending data:', xhr.status);
                    }
                }
            };
            xhr.send(JSON.stringify(payload));
        }
    }

    // Initial page view tracking
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            debugLog('📄 Page loaded, sending initial tracking');
            sendTrackingData('pageview');
        });
    } else {
        debugLog('📄 Page already loaded, sending initial tracking');
        sendTrackingData('pageview');
    }

    // Periodic data sending
    setInterval(function() {
        debugLog('⏰ Periodic data send');
        sendTrackingData('periodic');
    }, config.sendInterval);

    // Send data before page unload
    window.addEventListener('beforeunload', function() {
        debugLog('👋 Page unloading, sending final data');
        sendTrackingData('unload');
    });

    debugLog('✅ Fraud Detection Script Initialized');
})(); 
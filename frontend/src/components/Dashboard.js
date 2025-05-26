import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

const API_URL = 'http://localhost:3000/api';

function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClicks: 0,
    paidClicks: 0,
    organicClicks: 0,
    totalSuspicious: 0,
    blockedIPs: 0
  });
  const [detectionRules, setDetectionRules] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  
  useEffect(() => {
    fetchDashboardData();
    // עדכון אוטומטי כל 30 שניות
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setServerStatus('checking');
      
      // נסה לקבל נתונים מהשרת
      const responses = await Promise.allSettled([
        axios.get(`${API_URL}/clicks`), // כל הקליקים
        axios.get(`${API_URL}/clicks?type=paid`), // רק קליקים ממומנים
        axios.get(`${API_URL}/blocked-ips`),
        axios.get(`${API_URL}/detection-rules`),
        axios.get(`${API_URL}/suspicious-clicks`)
      ]);
      
      const allClicksData = responses[0].status === 'fulfilled' ? responses[0].value.data : [];
      const paidClicksData = responses[1].status === 'fulfilled' ? responses[1].value.data : [];
      const blockedData = responses[2].status === 'fulfilled' ? responses[2].value.data : [];
      const rulesData = responses[3].status === 'fulfilled' ? responses[3].value.data : [];
      const suspiciousData = responses[4].status === 'fulfilled' ? responses[4].value.data : [];
      
      // חישוב קליקים חשודים מהנתונים האמיתיים
      const suspiciousCount = suspiciousData.length || 0;
      const organicClicks = allClicksData.length - paidClicksData.length;
      
      setStats({
        totalClicks: allClicksData.length || 0,
        paidClicks: paidClicksData.length || 0,
        organicClicks: organicClicks || 0,
        totalSuspicious: suspiciousCount,
        blockedIPs: blockedData.length || 0
      });
      
      setDetectionRules(rulesData || []);
      
      setServerStatus('online');
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setServerStatus('offline');
      // הגדרת ערכי ברירת מחדל אם השרת לא זמין
      setStats({
        totalClicks: 0,
        paidClicks: 0,
        organicClicks: 0,
        totalSuspicious: 0,
        blockedIPs: 0
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const suspiciousPercentage = stats.totalClicks > 0 && stats.totalSuspicious > 0 ? 
    (stats.totalSuspicious / stats.totalClicks * 100).toFixed(1) : null;

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'לא עודכן';
    return lastUpdate.toLocaleTimeString('he-IL');
  };
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">🛡️ דשבורד הגנה</h1>
        <p className="dashboard-subtitle">מערכת מעקב וחסימת קליקים מזויפים</p>
      </div>
      
      <div className="dashboard-content">
        <div className="refresh-section">
          <button 
            className="refresh-button" 
            onClick={fetchDashboardData} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                טוען נתונים...
              </>
            ) : (
              '🔄 רענן נתונים'
            )}
          </button>
          <div className="last-update">
            עדכון אחרון: {formatLastUpdate()}
            <span className={`status-indicator ${serverStatus}`}></span>
          </div>
        </div>
        
        <div className="stats-grid">
          <div className="stat-card-modern total-clicks">
            <div className="stat-icon">📊</div>
            <div className="stat-title">סה"כ קליקים</div>
            <p className="stat-number-modern">
              {isLoading ? '...' : stats.totalClicks.toLocaleString()}
            </p>
            <div className="stat-change neutral">
              📊 כל הקליקים (ממומנים + אורגניים)
            </div>
          </div>
          
          <div className="stat-card-modern paid-clicks">
            <div className="stat-icon">💰</div>
            <div className="stat-title">קליקים ממומנים</div>
            <p className="stat-number-modern">
              {isLoading ? '...' : stats.paidClicks.toLocaleString()}
            </p>
            <div className="stat-change neutral">
              💰 מקמפיינים ממומנים (עם gclid)
            </div>
          </div>
          
          <div className="stat-card-modern suspicious-clicks">
            <div className="stat-icon">⚠️</div>
            <div className="stat-title">קליקים חשודים</div>
            <p className={`stat-number-modern ${stats.totalSuspicious === 0 && !isLoading ? 'no-data' : ''}`}>
              {isLoading ? '...' : stats.totalSuspicious > 0 ? stats.totalSuspicious.toLocaleString() : 'אין נתונים'}
            </p>
            <div className="stat-change neutral">
              🔍 זוהו על ידי כללי הזיהוי
            </div>
          </div>
          
          <div className="stat-card-modern blocked-ips">
            <div className="stat-icon">🚫</div>
            <div className="stat-title">IP חסומים</div>
            <p className="stat-number-modern">
              {isLoading ? '...' : stats.blockedIPs.toLocaleString()}
            </p>
            <div className="stat-change neutral">
              🛡️ הגנה פעילה
            </div>
          </div>
          
          <div className="stat-card-modern percentage">
            <div className="stat-icon">📈</div>
            <div className="stat-title">אחוז חשוד</div>
            <p className={`stat-number-modern ${!suspiciousPercentage && !isLoading ? 'no-data' : ''}`}>
              {isLoading ? '...' : suspiciousPercentage ? `${suspiciousPercentage}%` : 'אין מידע'}
            </p>
            <div className="stat-change neutral">
              📈 חשודים מתוך כל הקליקים
            </div>
          </div>
        </div>
        
        <div className="dashboard-sections">
          <div className="info-section-modern">
            <h3 className="info-title">
              🔍 כללי זיהוי פעילים
            </h3>
            <p className="info-content">
              כללי הזיהוי הנוכחיים שמגנים על הקמפיינים שלך:
            </p>
            {detectionRules.length > 0 ? (
              <div className="rules-grid">
                {detectionRules.slice(0, 6).map((rule, index) => (
                  <div key={index} className="rule-card">
                    <div className="rule-icon">
                      {rule.rule_type === 'clicks_per_ip' ? '🔢' :
                       rule.rule_type === 'time_on_page' ? '⏱️' :
                       rule.rule_type === 'rapid_clicks' ? '⚡' :
                       rule.rule_type === 'clicks_per_hour' ? '📊' :
                       rule.rule_type === 'clicks_per_day' ? '📈' :
                       rule.rule_type === 'user_agent' ? '🖥️' :
                       rule.rule_type === 'geo_location' ? '🌍' :
                       rule.rule_type === 'ip_frequency' ? '🔄' :
                       rule.rule_type === 'time_threshold' ? '⏱️' : '⚙️'}
                    </div>
                    <div className="rule-content">
                      <div className="rule-name">
                        {rule.rule_type === 'clicks_per_ip' ? 'קליקים לכל IP' :
                         rule.rule_type === 'time_on_page' ? 'זמן בעמוד' :
                         rule.rule_type === 'rapid_clicks' ? 'קליקים מהירים' :
                         rule.rule_type === 'clicks_per_hour' ? 'קליקים לשעה' :
                         rule.rule_type === 'clicks_per_day' ? 'קליקים ליום' :
                         rule.rule_type === 'user_agent' ? 'User Agent' :
                         rule.rule_type === 'geo_location' ? 'מיקום גיאוגרפי' :
                         rule.rule_type === 'ip_frequency' ? 'תדירות IP' :
                         rule.rule_type === 'time_threshold' ? 'זמן בעמוד' : rule.rule_type}
                      </div>
                      <div className="rule-value">
                        {rule.rule_type === 'clicks_per_ip' ? `מקסימום ${rule.rule_value} קליקים ליום` :
                         rule.rule_type === 'time_on_page' ? `מינימום ${rule.rule_value} שניות` :
                         rule.rule_type === 'rapid_clicks' ? `מינימום ${rule.rule_value} שניות בין קליקים` :
                         rule.rule_type === 'clicks_per_hour' ? `מקסימום ${rule.rule_value} קליקים לשעה` :
                         rule.rule_type === 'clicks_per_day' ? `מקסימום ${rule.rule_value} קליקים ליום` :
                         rule.rule_value}
                      </div>
                      <div className={`rule-status ${rule.is_active ? 'active' : 'inactive'}`}>
                        {rule.is_active ? '✅ פעיל' : '❌ לא פעיל'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-rules">
                <div className="no-rules-icon">📋</div>
                <p>לא הוגדרו כללי זיהוי עדיין</p>
                <p className="no-rules-subtitle">עבור לעמוד "כללי זיהוי" כדי להגדיר כללים</p>
              </div>
            )}
          </div>

          <div className="info-section-modern">
            <h3 className="info-title">
              ⚙️ מצב המערכת
            </h3>
            <p className="info-content">
              המערכת פועלת ומוכנה לפעולה. כדי להתחיל לעקוב אחר קליקים ולהגן על הקמפיינים שלך, 
              וודא שהשלבים הבאים הושלמו:
            </p>
            <ul className="setup-checklist">
              <li>
                <span className="checklist-icon">1</span>
                הגדרת קובץ .env עם פרטי החיבור ל-Google Ads ו-Supabase
              </li>
              <li>
                <span className="checklist-icon">2</span>
                הפעלת השרת (npm start בתיקיית backend)
              </li>
              <li>
                <span className="checklist-icon">3</span>
                הטמעת סקריפט המעקב באתר שלך
              </li>
              <li>
                <span className="checklist-icon">4</span>
                הגדרת כללי זיהוי מותאמים אישית
              </li>
            </ul>
          </div>
        </div>
        
        <div className="status-indicators">
          <div className="status-card">
            <h4>🌐 שרת API</h4>
            <p>
              {serverStatus === 'online' ? 'מחובר' : 
               serverStatus === 'offline' ? 'לא זמין' : 'בודק...'}
              <span className={`status-indicator ${serverStatus}`}></span>
            </p>
            <small style={{color: '#666', fontSize: '0.8rem'}}>
              פורט 3000
            </small>
          </div>
          
          <div className="status-card">
            <h4>📊 מסד נתונים</h4>
            <p>
              {serverStatus === 'online' ? 'פעיל' : 'לא זמין'}
              <span className={`status-indicator ${serverStatus}`}></span>
            </p>
            <small style={{color: '#666', fontSize: '0.8rem'}}>
              Supabase
            </small>
          </div>
          
          <div className="status-card">
            <h4>🔍 כללי זיהוי</h4>
            <p>
              {detectionRules.filter(rule => rule.is_active).length} כללים פעילים
              <span className={`status-indicator ${detectionRules.filter(rule => rule.is_active).length > 0 ? 'online' : 'offline'}`}></span>
            </p>
            <small style={{color: '#666', fontSize: '0.8rem'}}>
              מתוך {detectionRules.length} כללים כולל
            </small>
          </div>
          
          <div className="status-card">
            <h4>🛡️ הגנה פעילה</h4>
            <p>
              {serverStatus === 'online' ? 'פעילה ומנטרת' : 'לא פעילה'}
              <span className={`status-indicator ${serverStatus === 'online' ? 'online' : 'offline'}`}></span>
            </p>
            {serverStatus === 'online' && (
              <small style={{color: '#666', fontSize: '0.8rem'}}>
                {stats.blockedIPs > 0 ? `חסמה ${stats.blockedIPs} IP` : 'מנטרת ומוכנה לחסום'}
              </small>
            )}
          </div>
          
          <div className="status-card">
            <h4>🔄 עדכון אוטומטי</h4>
            <p>
              פעיל
              <span className="status-indicator online"></span>
            </p>
            <small style={{color: '#666', fontSize: '0.8rem'}}>
              כל 30 שניות
            </small>
          </div>
          
          <div className="status-card">
            <h4>⚡ ביצועים</h4>
            <p>
              {serverStatus === 'online' ? 'מצוין' : 'לא זמין'}
              <span className={`status-indicator ${serverStatus === 'online' ? 'online' : 'offline'}`}></span>
            </p>
            <small style={{color: '#666', fontSize: '0.8rem'}}>
              זמן תגובה מהיר
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
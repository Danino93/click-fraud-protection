import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

function Settings() {
  const [settings, setSettings] = useState({
    auto_block_suspicious: false,
    notification_email: '',
    notification_threshold: 5,
    google_ads_sync_interval: 60,
    ip_block_duration: 30
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('אירעה שגיאה בטעינת ההגדרות. משתמש בהגדרות ברירת מחדל.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSettingChange = (field, value) => {
    setSettings({
      ...settings,
      [field]: value
    });
  };
  
  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      await axios.post(`${API_URL}/settings`, settings);
      
      setSuccess('ההגדרות נשמרו בהצלחה');
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('אירעה שגיאה בשמירת ההגדרות');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTestGoogleAdsConnection = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      const response = await axios.get(`${API_URL}/test-google-ads-connection`);
      
      setSuccess(`החיבור ל-Google Ads תקין! מזהה לקוח: ${response.data.customer_id}`);
    } catch (error) {
      console.error('Error testing Google Ads connection:', error);
      setError('אירעה שגיאה בבדיקת החיבור ל-Google Ads. יש לוודא שפרטי החיבור נכונים.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="settings">
      <h2>הגדרות מערכת</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="settings-form">
        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={settings.auto_block_suspicious}
              onChange={(e) => handleSettingChange('auto_block_suspicious', e.target.checked)}
            />
            חסימה אוטומטית של IP חשודים
          </label>
        </div>
        
        <div className="form-group">
          <label htmlFor="notification-email">אימייל להתראות:</label>
          <input
            type="email"
            id="notification-email"
            value={settings.notification_email}
            onChange={(e) => handleSettingChange('notification_email', e.target.value)}
            placeholder="example@domain.com"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="notification-threshold">סף להתראות (מספר קליקים חשודים):</label>
          <input
            type="number"
            id="notification-threshold"
            value={settings.notification_threshold}
            onChange={(e) => handleSettingChange('notification_threshold', parseInt(e.target.value))}
            min="1"
            max="100"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="google-ads-sync-interval">תדירות סנכרון עם Google Ads (בדקות):</label>
          <input
            type="number"
            id="google-ads-sync-interval"
            value={settings.google_ads_sync_interval}
            onChange={(e) => handleSettingChange('google_ads_sync_interval', parseInt(e.target.value))}
            min="15"
            max="1440"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="ip-block-duration">משך חסימת IP (בימים):</label>
          <input
            type="number"
            id="ip-block-duration"
            value={settings.ip_block_duration}
            onChange={(e) => handleSettingChange('ip_block_duration', parseInt(e.target.value))}
            min="1"
            max="365"
          />
        </div>
        
        <div className="form-actions">
          <button
            onClick={handleSaveSettings}
            disabled={isLoading}
          >
            {isLoading ? 'שומר הגדרות...' : 'שמור הגדרות'}
          </button>
          
          <button
            onClick={handleTestGoogleAdsConnection}
            disabled={isLoading}
            className="secondary-button"
          >
            בדוק חיבור ל-Google Ads
          </button>
        </div>
      </div>
      
      <div className="settings-section">
        <h3>הגדרות חיבור Google Ads</h3>
        <p>שים לב: הגדרות החיבור ל-Google Ads מוגדרות בקובץ הסביבה (.env) של השרת.</p>
        <p>יש לוודא שהגדרות אלה נכונות לפני הפעלת המערכת.</p>
        
        <div className="connection-info">
          <div className="info-item">
            <span className="label">סטטוס חיבור:</span>
            <span className="value">
              {isLoading ? 'בודק...' : success ? 'מחובר' : 'לא ידוע'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
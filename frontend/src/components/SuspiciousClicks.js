import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function SuspiciousClicks() {
  const [suspiciousClicks, setSuspiciousClicks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    timeRange: '7days',
    ruleType: 'all'
  });
  
  useEffect(() => {
    fetchSuspiciousClicks();
  }, [filter]);
  
  const fetchSuspiciousClicks = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      if (filter.timeRange !== 'all') {
        params.append('timeRange', filter.timeRange);
      }
      if (filter.ruleType !== 'all') {
        params.append('ruleType', filter.ruleType);
      }
      
      const response = await axios.get(`${API_URL}/suspicious-clicks?${params.toString()}`);
      setSuspiciousClicks(response.data);
    } catch (error) {
      console.error('Error fetching suspicious clicks:', error);
      setError('אירעה שגיאה בטעינת הקליקים החשודים. ודא שהשרת פועל.');
      setSuspiciousClicks([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFilterChange = (field, value) => {
    setFilter({
      ...filter,
      [field]: value
    });
  };
  
  const handleBlockIP = async (ip) => {
    if (!window.confirm(`האם אתה בטוח שברצונך לחסום את כתובת IP ${ip}?`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      await axios.post(`${API_URL}/block-ip`, {
        ip,
        reason: 'ידני - מרשימת קליקים חשודים',
        campaign_id: null
      });
      
      alert(`כתובת IP ${ip} נחסמה בהצלחה`);
      
      // רענון הרשימה
      fetchSuspiciousClicks();
    } catch (error) {
      console.error('Error blocking IP:', error);
      alert(error.response?.data?.error || 'אירעה שגיאה בחסימת כתובת ה-IP');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewDetails = (clickId) => {
    // הצגת פרטים מורחבים
    const click = suspiciousClicks.find(c => c.id === clickId);
    if (click) {
      alert(JSON.stringify(click.click_data, null, 2));
    }
  };
  
  return (
    <div className="suspicious-clicks">
      <h2>קליקים חשודים</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="time-range">טווח זמן:</label>
          <select
            id="time-range"
            value={filter.timeRange}
            onChange={(e) => handleFilterChange('timeRange', e.target.value)}
          >
            <option value="all">הכל</option>
            <option value="today">היום</option>
            <option value="yesterday">אתמול</option>
            <option value="7days">7 ימים אחרונים</option>
            <option value="30days">30 ימים אחרונים</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="rule-type">סוג כלל:</label>
          <select
            id="rule-type"
            value={filter.ruleType}
            onChange={(e) => handleFilterChange('ruleType', e.target.value)}
          >
            <option value="all">הכל</option>
            <option value="time_on_page">זמן בדף</option>
            <option value="multiple_clicks">קליקים מרובים</option>
            <option value="geo_location">מיקום גיאוגרפי</option>
            <option value="user_agent">סוכן משתמש</option>
            <option value="referrer">מפנה</option>
            <option value="bot_pattern">דפוס בוט</option>
            <option value="conversion_rate">יחס המרה</option>
          </select>
        </div>
        
        <button onClick={fetchSuspiciousClicks} disabled={isLoading}>
          {isLoading ? 'טוען...' : 'רענן'}
        </button>
      </div>
      
      <div className="suspicious-clicks-list">
        <h3>קליקים חשודים ({suspiciousClicks.length})</h3>
        
        {isLoading ? (
          <div className="loading">טוען נתונים...</div>
        ) : suspiciousClicks.length === 0 ? (
          <div className="empty-message">אין קליקים חשודים בטווח הזמן שנבחר</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>כתובת IP</th>
                <th>תאריך</th>
                <th>סוג הכלל</th>
                <th>דף</th>
                <th>מפנה</th>
                <th>סטטוס חסימה</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {suspiciousClicks.map(click => (
                <tr key={click.id}>
                  <td>{click.ip_address}</td>
                  <td>{new Date(click.created_at).toLocaleString()}</td>
                  <td>{click.rule_type}</td>
                  <td>{click.click_data?.page || 'לא ידוע'}</td>
                  <td>{click.click_data?.referrer || 'ישירות'}</td>
                  <td>{click.is_blocked ? 'חסום' : 'לא חסום'}</td>
                  <td>
                    <button
                      className="view-details-button"
                      onClick={() => handleViewDetails(click.id)}
                    >
                      פרטים
                    </button>
                    {!click.is_blocked && (
                      <button
                        className="block-button"
                        onClick={() => handleBlockIP(click.ip_address)}
                        disabled={isLoading}
                      >
                        חסום IP
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default SuspiciousClicks;
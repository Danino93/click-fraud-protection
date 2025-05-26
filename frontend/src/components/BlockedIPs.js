import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

function BlockedIPs() {
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newIP, setNewIP] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    fetchBlockedIPs();
  }, []);
  
  const fetchBlockedIPs = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/blocked-ips`);
      setBlockedIPs(response.data);
    } catch (error) {
      console.error('Error fetching blocked IPs:', error);
      setError('אירעה שגיאה בטעינת רשימת כתובות ה-IP החסומות. ודא שהשרת פועל.');
      setBlockedIPs([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBlockIP = async (e) => {
    e.preventDefault();
    
    if (!newIP) {
      setError('יש להזין כתובת IP');
      return;
    }
    
    // וולידציה בסיסית לכתובת IP
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(newIP)) {
      setError('כתובת IP לא תקינה');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      await axios.post(`${API_URL}/block-ip`, {
        ip: newIP,
        reason: reason || 'חסימה ידנית',
        campaign_id: null
      });
      
      setSuccess(`כתובת IP ${newIP} נחסמה בהצלחה`);
      setNewIP('');
      setReason('');
      
      // רענון הרשימה
      fetchBlockedIPs();
    } catch (error) {
      console.error('Error blocking IP:', error);
      setError(error.response?.data?.error || 'אירעה שגיאה בחסימת כתובת ה-IP');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUnblockIP = async (id, ip) => {
    if (!window.confirm(`האם אתה בטוח שברצונך לבטל את חסימת כתובת IP ${ip}?`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      await axios.delete(`${API_URL}/unblock-ip/${id}`);
      
      setSuccess(`כתובת IP ${ip} שוחררה מחסימה בהצלחה`);
      
      // רענון הרשימה
      fetchBlockedIPs();
    } catch (error) {
      console.error('Error unblocking IP:', error);
      setError(error.response?.data?.error || 'אירעה שגיאה בשחרור חסימת כתובת ה-IP');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="blocked-ips">
      <h2>ניהול כתובות IP חסומות</h2>
      
      <div className="block-ip-form" style={{marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '5px'}}>
        <h3>הוספת כתובת IP לחסימה</h3>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleBlockIP}>
          <div className="form-group">
            <label htmlFor="ip">כתובת IP:</label>
            <input
              type="text"
              id="ip"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              placeholder="לדוגמה: 192.168.1.1"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="reason">סיבת החסימה:</label>
            <input
              type="text"
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="לדוגמה: פעילות חשודה"
            />
          </div>
          
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'מעבד...' : 'חסום כתובת IP'}
          </button>
        </form>
      </div>
      
      <div className="blocked-ips-list">
        <h3>כתובות IP חסומות ({blockedIPs.length})</h3>
        
        {isLoading ? (
          <div className="loading">טוען נתונים...</div>
        ) : blockedIPs.length === 0 ? (
          <div className="empty-message">אין כתובות IP חסומות</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>כתובת IP</th>
                <th>סיבת חסימה</th>
                <th>תאריך חסימה</th>
                <th>נחסם על ידי</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {blockedIPs.map(ip => (
                <tr key={ip.id}>
                  <td>{ip.ip_address}</td>
                  <td>{ip.reason}</td>
                  <td>{new Date(ip.created_at).toLocaleString()}</td>
                  <td>{ip.blocked_by}</td>
                  <td>
                    <button 
                      className="unblock-button"
                      onClick={() => handleUnblockIP(ip.id, ip.ip_address)}
                      disabled={isLoading}
                    >
                      שחרר
                    </button>
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

export default BlockedIPs;
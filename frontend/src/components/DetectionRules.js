import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

function DetectionRules() {
  const [rules, setRules] = useState([
    {
      id: 1,
      rule_type: 'time_on_page',
      rule_value: '5',
      is_active: true,
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      rule_type: 'multiple_clicks',
      rule_value: '10',
      is_active: true,
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      rule_type: 'user_agent',
      rule_value: 'bot,crawler,spider',
      is_active: true,
      updated_at: new Date().toISOString()
    }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // מצב עבור הוספת כלל חדש
  const [newRule, setNewRule] = useState({
    rule_type: 'time_on_page',
    rule_value: '',
    is_active: true
  });
  
  useEffect(() => {
    fetchRules();
  }, []);
  
  const fetchRules = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/detection-rules`);
      setRules(response.data);
    } catch (error) {
      console.error('Error fetching rules:', error);
      setError('אירעה שגיאה בטעינת כללי הזיהוי. משתמש בכללי ברירת מחדל.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRuleChange = (id, field, value) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };
  
  const handleNewRuleChange = (field, value) => {
    setNewRule({ ...newRule, [field]: value });
  };
  
  const handleSaveRules = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      await axios.post(`${API_URL}/detection-rules`, {
        rules: rules
      });
      
      setSuccess('כללי הזיהוי נשמרו בהצלחה');
    } catch (error) {
      console.error('Error saving rules:', error);
      setError('אירעה שגיאה בשמירת כללי הזיהוי');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddRule = () => {
    if (!newRule.rule_value) {
      setError('יש להזין ערך לכלל');
      return;
    }
    
    const nextId = Math.max(...rules.map(r => r.id)) + 1;
    const ruleToAdd = {
      ...newRule,
      id: nextId,
      updated_at: new Date().toISOString()
    };
    
    setRules([...rules, ruleToAdd]);
    setSuccess('הכלל החדש נוסף בהצלחה');
    
    // איפוס טופס הוספת כלל
    setNewRule({
      rule_type: 'time_on_page',
      rule_value: '',
      is_active: true
    });
  };
  
  const getRuleTypeLabel = (type) => {
    const types = {
      'time_on_page': 'זמן בדף (שניות)',
      'multiple_clicks': 'קליקים מרובים (בדקות)',
      'clicks_per_hour': 'מקסימום קליקים לשעה',
      'clicks_per_day': 'מקסימום קליקים ליום',
      'clicks_per_ip': 'מקסימום קליקים לכל IP',
      'rapid_clicks': 'קליקים מהירים (שניות בין קליקים)',
      'geo_location': 'מיקום גיאוגרפי (קודי מדינות)',
      'user_agent': 'סוכן משתמש (מילות מפתח)',
      'referrer': 'מפנה (מילות מפתח)',
      'bot_pattern': 'דפוס בוט',
      'conversion_rate': 'יחס המרה'
    };
    
    return types[type] || type;
  };
  
  return (
    <div className="detection-rules">
      <h2>ניהול כללי זיהוי</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="add-rule-form" style={{marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '5px'}}>
        <h3>הוספת כלל חדש</h3>
        
        <div className="form-group">
          <label htmlFor="rule-type">סוג הכלל:</label>
          <select
            id="rule-type"
            value={newRule.rule_type}
            onChange={(e) => handleNewRuleChange('rule_type', e.target.value)}
          >
            <option value="time_on_page">זמן בדף (שניות)</option>
            <option value="multiple_clicks">קליקים מרובים (בדקות)</option>
            <option value="clicks_per_hour">מקסימום קליקים לשעה</option>
            <option value="clicks_per_day">מקסימום קליקים ליום</option>
            <option value="clicks_per_ip">מקסימום קליקים לכל IP</option>
            <option value="rapid_clicks">קליקים מהירים (שניות בין קליקים)</option>
            <option value="geo_location">מיקום גיאוגרפי (קודי מדינות)</option>
            <option value="user_agent">סוכן משתמש (מילות מפתח)</option>
            <option value="referrer">מפנה (מילות מפתח)</option>
            <option value="bot_pattern">דפוס בוט</option>
            <option value="conversion_rate">יחס המרה</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="rule-value">ערך:</label>
          <input
            type="text"
            id="rule-value"
            value={newRule.rule_value}
            onChange={(e) => handleNewRuleChange('rule_value', e.target.value)}
            placeholder="הזן ערך לכלל"
          />
          {newRule.rule_type === 'time_on_page' && (
            <small style={{display: 'block', marginTop: '5px', color: '#6c757d'}}>
              מספר שניות מינימלי שמשתמש צריך להיות בדף (לדוגמה: 5)
            </small>
          )}
          {newRule.rule_type === 'multiple_clicks' && (
            <small style={{display: 'block', marginTop: '5px', color: '#6c757d'}}>
              טווח זמן בדקות לבדיקת קליקים מרובים (לדוגמה: 10)
            </small>
          )}
          {newRule.rule_type === 'clicks_per_hour' && (
            <small style={{display: 'block', marginTop: '5px', color: '#6c757d'}}>
              מספר מקסימלי של קליקים לשעה מכל המקורות (לדוגמה: 100)
            </small>
          )}
          {newRule.rule_type === 'clicks_per_day' && (
            <small style={{display: 'block', marginTop: '5px', color: '#6c757d'}}>
              מספר מקסימלי של קליקים ליום מכל המקורות (לדוגמה: 1000)
            </small>
          )}
          {newRule.rule_type === 'clicks_per_ip' && (
            <small style={{display: 'block', marginTop: '5px', color: '#6c757d'}}>
              מספר מקסימלי של קליקים מאותו IP ליום (לדוגמה: 5)
            </small>
          )}
          {newRule.rule_type === 'rapid_clicks' && (
            <small style={{display: 'block', marginTop: '5px', color: '#6c757d'}}>
              מספר שניות מינימלי בין קליקים מאותו IP (לדוגמה: 10)
            </small>
          )}
          {newRule.rule_type === 'geo_location' && (
            <small style={{display: 'block', marginTop: '5px', color: '#6c757d'}}>
              קודי מדינות מופרדים בפסיקים (לדוגמה: RU,CN,KP)
            </small>
          )}
        </div>
        
        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={newRule.is_active}
              onChange={(e) => handleNewRuleChange('is_active', e.target.checked)}
            />
            פעיל
          </label>
        </div>
        
        <button 
          onClick={handleAddRule}
          disabled={isLoading}
        >
          הוסף כלל
        </button>
      </div>
      
      <div className="rules-list">
        <h3>כללי זיהוי קיימים ({rules.length})</h3>
        
        {isLoading ? (
          <div className="loading">טוען נתונים...</div>
        ) : rules.length === 0 ? (
          <div className="empty-message">אין כללי זיהוי מוגדרים</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>סוג הכלל</th>
                  <th>ערך</th>
                  <th>פעיל</th>
                  <th>עדכון אחרון</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id}>
                    <td>{getRuleTypeLabel(rule.rule_type)}</td>
                    <td>
                      <input
                        type="text"
                        value={rule.rule_value}
                        onChange={(e) => handleRuleChange(rule.id, 'rule_value', e.target.value)}
                        style={{width: '200px', padding: '0.3rem'}}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={rule.is_active}
                          onChange={(e) => handleRuleChange(rule.id, 'is_active', e.target.checked)}
                        />
                      </td>
                      <td>{new Date(rule.updated_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="save-rules" style={{marginTop: '1rem'}}>
                <button 
                  onClick={handleSaveRules}
                  disabled={isLoading}
                >
                  {isLoading ? 'שומר שינויים...' : 'שמור שינויים'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
   }
   
   export default DetectionRules;
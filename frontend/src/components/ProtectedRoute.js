import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './Login';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      // בדיקת תקפות הטוקן עם השרת
      const response = await axios.get(`${API_URL}/verify-token`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.valid) {
        setIsAuthenticated(true);
        // הגדרת הטוקן כברירת מחדל לכל הבקשות
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        // טוקן לא תקף
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      // טוקן לא תקף או שגיאה בשרת
      localStorage.removeItem('authToken');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (token) => {
    setIsAuthenticated(true);
    // הגדרת הטוקן כברירת מחדל לכל הבקשות
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        טוען...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // העברת פונקציית logout לקומפוננטות הילדים
  return React.cloneElement(children, { onLogout: handleLogout });
}

export default ProtectedRoute; 
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';

// קומפוננטות
import Dashboard from './components/Dashboard';
import BlockedIPs from './components/BlockedIPs';
import DetectionRules from './components/DetectionRules';
import SuspiciousClicks from './components/SuspiciousClicks';
import Settings from './components/Settings';
import ProtectedRoute from './components/ProtectedRoute';

// סטיילים
import './App.css';

// הגדרת כתובת השרת
const API_URL = process.env.REACT_APP_API_URL || '/api';

function App({ onLogout }) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClicks: 0,
    suspiciousClicks: 0,
    blockedIPs: 0,
    activeRules: 0
  });

  useEffect(() => {
    // טעינת סטטיסטיקות כלליות בעת טעינת האפליקציה
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const [blockedRes] = await Promise.all([
          axios.get(`${API_URL}/blocked-ips`).catch(() => ({ data: [] }))
        ]);
        
        setStats({
          totalClicks: 0,
          suspiciousClicks: 0,
          blockedIPs: blockedRes.data.length || 0,
          activeRules: 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
    
    // עדכון סטטיסטיקות כל דקה
    const intervalId = setInterval(fetchStats, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Router>
      <div className="app">
        <header className="header">
          <h1>מערכת הגנה מפני קליקים מזויפים</h1>
          {onLogout && (
            <button 
              className="logout-button" 
              onClick={onLogout}
              title="יציאה מהמערכת"
            >
              יציאה
            </button>
          )}
        </header>
        
        <div className="container">
          <nav className="sidebar">
            <ul>
              <li>
                <Link to="/">
                  🏠 דשבורד
                </Link>
              </li>
              <li>
                <Link to="/blocked">
                  🚫 IP חסומים
                <span className="badge">{stats.blockedIPs}</span>
                </Link>
              </li>
              <li>
                <Link to="/suspicious">
                  ⚠️ קליקים חשודים
                <span className="badge">{stats.suspiciousClicks}</span>
                </Link>
              </li>
              <li>
                <Link to="/rules">
                  🔍 כללי זיהוי
                <span className="badge">{stats.activeRules}</span>
                </Link>
              </li>
              <li>
                <Link to="/settings">
                  ⚙️ הגדרות
                </Link>
              </li>
            </ul>
            
            <div className="stats-summary">
              <h3>סטטיסטיקות מהירות</h3>
              <p>סה"כ קליקים: {isLoading ? '...' : stats.totalClicks}</p>
              <p>קליקים חשודים: {isLoading ? '...' : stats.suspiciousClicks}</p>
              <p>אחוז חשודים: {isLoading ? '...' : stats.totalClicks > 0 ? ((stats.suspiciousClicks / stats.totalClicks) * 100).toFixed(1) : 0}%</p>
            </div>
          </nav>
          
          <main className="content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/blocked" element={<BlockedIPs />} />
              <Route path="/suspicious" element={<SuspiciousClicks />} />
              <Route path="/rules" element={<DetectionRules />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
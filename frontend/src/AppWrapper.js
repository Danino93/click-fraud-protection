import React from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import App from './App';

function AppWrapper() {
  return (
    <ProtectedRoute>
      <App />
    </ProtectedRoute>
  );
}

export default AppWrapper; 
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './kyswa-design.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastContainer } from './components/Toast.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <ToastContainer />
    </AuthProvider>
  </React.StrictMode>
);

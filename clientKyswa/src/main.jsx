import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './kyswa-design.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { ToastContainer } from './components/Toast.jsx';
import { PermissionsProvider } from './context/PermissionsContext.jsx';
import { useAuth } from './context/AuthContext.jsx';

// Wrapper interne pour accéder à user depuis AuthContext
function AppWithPermissions() {
  const { user } = useAuth();
  return (
    <PermissionsProvider user={user}>
      <App />
      <ToastContainer />
    </PermissionsProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <AuthProvider>
        <AppWithPermissions />
      </AuthProvider>
    </AppProvider>
  </React.StrictMode>
);

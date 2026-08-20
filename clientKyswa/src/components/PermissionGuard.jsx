import { usePermissions } from '../hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import AccessDeniedPage from './AccessDeniedPage';

/**
 * Composant qui protège l'accès à certaines fonctionnalités selon les permissions
 */
const PermissionGuard = ({ 
  children, 
  module, 
  action = 'view',
  fallback = null,
  redirectTo = null,
  showMessage = true 
}) => {
  const { hasPermission, loading, isSuperAdmin } = usePermissions();

  if (loading && !isSuperAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="spinner" style={{ width: 36, height: 36, border: '3px solid rgba(0,103,79,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!hasPermission(module, action)) {
    if (fallback) {
      return fallback;
    }

    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    if (showMessage) {
      return <AccessDeniedPage module={module} />;
    }

    return null;
  }

  return children;
};

export default PermissionGuard;
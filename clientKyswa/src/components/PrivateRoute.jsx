import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Protège une route : redirige vers /login si non authentifié
export function PrivateRoute({ children, roles }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Si des rôles sont spécifiés, vérifier l'accès
  if (roles && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Redirige vers /dashboard si déjà connecté (pour la page login)
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return children;
}

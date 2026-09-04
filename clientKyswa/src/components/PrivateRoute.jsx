import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_REDIRECT } from '../utils/roles';
import usePermissions from '../hooks/usePermissions';

// Protège une route : vérifie authentification, rôles ou permissions de module
export function PrivateRoute({ children, roles, module }) {
  const { isAuthenticated, role, loading } = useAuth();
  const { canViewModule, loading: permLoading } = usePermissions();

  if (loading || permLoading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isSuper = ['dg', 'administrateur', 'informatique', 'admin'].includes(role?.toLowerCase());

  // Super-admin a toujours accès
  if (isSuper) return children;

  // Vérifier si le rôle est explicitement autorisé par la route
  const isAllowed = !roles || roles.includes(role) ||
    ((role === 'informatique' || role === 'admin') && (roles.includes('administrateur') || roles.includes('informatique')));

  // Si un module spécifique est indiqué, autoriser si permission dynamique OK ou rôle OK
  if (module) {
    if (canViewModule(module) || isAllowed) return children;
    return <Navigate to={DEFAULT_REDIRECT[role] || '/dashboard'} replace />;
  }

  if (!isAllowed) {
    return <Navigate to={DEFAULT_REDIRECT[role] || '/dashboard'} replace />;
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

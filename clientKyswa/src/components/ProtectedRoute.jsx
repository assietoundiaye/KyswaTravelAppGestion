import { Navigate } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import LoadingScreen from './LoadingScreen';

/**
 * Composant de protection de route basé sur les permissions
 * @param {Object} props
 * @param {string} props.module - Le module requis pour accéder à cette route
 * @param {string} props.action - L'action requise (par défaut: 'view')
 * @param {React.ReactNode} props.children - Le contenu à afficher si autorisé
 * @param {string} props.redirectTo - URL de redirection si non autorisé (par défaut: '/dashboard/commercial')
 */
export default function ProtectedRoute({ 
  module, 
  action = 'view', 
  children, 
  redirectTo = '/dashboard/commercial' 
}) {
  const { hasPermission, loading } = usePermissions();

  // Afficher un loader pendant le chargement des permissions
  if (loading) {
    return <LoadingScreen />;
  }

  // Vérifier si l'utilisateur a la permission requise
  if (!hasPermission(module, action)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
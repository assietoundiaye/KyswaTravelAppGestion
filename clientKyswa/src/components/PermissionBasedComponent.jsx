import usePermissions from '../hooks/usePermissions';

/**
 * Composant générique pour afficher conditionnellement du contenu selon les permissions
 * 
 * Utilisation:
 * <PermissionBasedComponent module="clients" action="view">
 *   <button>Voir clients</button>
 * </PermissionBasedComponent>
 * 
 * <PermissionBasedComponent module="shop" action="create" fallback={<span>Pas d'accès</span>}>
 *   <button>Créer produit</button>
 * </PermissionBasedComponent>
 */
export default function PermissionBasedComponent({
  module,
  action = 'view',
  children,
  fallback = null,
  showLoading = false
}) {
  const { hasPermission, loading } = usePermissions();

  if (loading && showLoading) {
    return <div className="permission-loading">Chargement...</div>;
  }

  if (loading && !showLoading) {
    return children; // Afficher le contenu pendant le chargement
  }

  if (!hasPermission(module, action)) {
    return fallback;
  }

  return children;
}
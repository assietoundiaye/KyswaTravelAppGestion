import usePermissions from '../hooks/usePermissions';

/**
 * Composant wrapper pour masquer conditionnellement du contenu selon les permissions
 * @param {Object} props
 * @param {string} props.module - Le module à vérifier
 * @param {string} props.action - L'action requise (view, create, edit, delete)
 * @param {React.ReactNode} props.children - Le contenu à afficher si autorisé
 * @param {React.ReactNode} props.fallback - Contenu alternatif si non autorisé
 * @param {boolean} props.hide - Si true, masque complètement. Si false, désactive seulement
 */
export default function PermissionWrapper({ 
  module, 
  action = 'view', 
  children, 
  fallback = null,
  hide = true
}) {
  const { hasPermission, loading } = usePermissions();

  // Pendant le chargement, afficher le contenu pour éviter un flash
  if (loading) {
    return children;
  }

  const hasAccess = hasPermission(module, action);

  if (!hasAccess) {
    if (hide) {
      return fallback;
    }
    
    // Essayer de désactiver plutôt que masquer
    try {
      if (children?.props) {
        return { ...children, props: { ...children.props, disabled: true } };
      }
    } catch (error) {
      return fallback;
    }
  }

  return children;
}
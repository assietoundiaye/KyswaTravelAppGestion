import React from 'react';
import usePermissions from './usePermissions';

/**
 * Hook pour protéger conditionnellement les éléments UI selon les permissions
 * Utilise les permissions pour décider si un élément doit être affiché ou activé
 */
export const usePermissionGuard = () => {
  const { hasPermission, canViewModule, getModulePermissions, loading } = usePermissions();

  /**
   * Composant wrapper qui masque ses enfants si l'utilisateur n'a pas la permission
   * @param {Object} props
   * @param {string} props.module - Le module à vérifier
   * @param {string} props.action - L'action requise (view, create, edit, delete)
   * @param {React.ReactNode} props.children - Les éléments à afficher conditionnellement
   * @param {React.ReactNode} props.fallback - Élément alternatif à afficher si pas de permission
   * @param {boolean} props.disabled - Si true, désactive plutôt que de masquer
   */
  const PermissionGuard = ({ 
    module, 
    action = 'view', 
    children, 
    fallback = null,
    disabled = false 
  }) => {
    if (loading) {
      return fallback;
    }

    const hasAccess = hasPermission(module, action);

    if (!hasAccess) {
      return fallback;
    }

    // Si disabled est true et pas de permission, on clone les enfants avec disabled
    if (disabled && !hasAccess && children) {
      try {
        return React.cloneElement(children, { disabled: true });
      } catch {
        return fallback;
      }
    }

    return children;
  };

  /**
   * Vérifie si un bouton ou action doit être visible/activé
   * @param {string} module - Le module à vérifier
   * @param {string} action - L'action requise
   * @returns {Object} { canShow: boolean, canInteract: boolean }
   */
  const checkActionPermission = (module, action = 'view') => ({
    canShow: hasPermission(module, action),
    canInteract: hasPermission(module, action),
  });

  /**
   * Filtre une liste d'éléments selon les permissions
   * @param {Array} items - Liste d'éléments avec une propriété 'module'
   * @param {string} action - Action requise
   * @returns {Array} Liste filtrée
   */
  const filterByPermissions = (items, action = 'view') => {
    if (loading) return items;
    return items.filter(item => 
      !item.module || hasPermission(item.module, action)
    );
  };

  return {
    PermissionGuard,
    checkActionPermission,
    filterByPermissions,
    hasPermission,
    canViewModule,
    getModulePermissions,
    loading
  };
};

export default usePermissionGuard;
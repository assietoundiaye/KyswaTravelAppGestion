import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../core/api/axios';

const PermissionsContext = createContext(null);

// Rôles qui ont toujours tous les droits (miroir du backend)
const SUPER_ROLES = ['dg', 'administrateur', 'informatique', 'admin'];

/**
 * Fournit le contexte de permissions à toute l'application.
 * Se charge automatiquement depuis /api/permissions/me quand l'utilisateur est connecté.
 */
export function PermissionsProvider({ children, user }) {
  const [permissions, setPermissions] = useState({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasCustom, setHasCustom] = useState({});     // modules avec exception admin active

  const loadPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissions({});
      setIsSuperAdmin(false);
      setHasCustom({});
      return;
    }
    if (SUPER_ROLES.includes(user.role)) {
      setIsSuperAdmin(true);
      setPermissions({});
      setHasCustom({});
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/permissions/me');
      setPermissions(res.data.permissions || {});
      setIsSuperAdmin(res.data.isSuperAdmin || false);
      setHasCustom(res.data.hasCustom || {});
    } catch {
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  /**
   * Vérifie si l'utilisateur a un droit sur un module
   * @param {string} module - ex: 'clients'
   * @param {'view'|'create'|'edit'|'delete'} action
   * @returns {boolean}
   */
  const hasPermission = useCallback((module, action) => {
    if (isSuperAdmin || SUPER_ROLES.includes(user?.role)) return true;
    const modPerms = permissions[module];
    if (!modPerms) return false;
    const map = { view: 'canView', create: 'canCreate', edit: 'canEdit', delete: 'canDelete' };
    return !!modPerms[map[action]];
  }, [permissions, isSuperAdmin, user?.role]);

  /**
   * Vérifie si l'utilisateur peut voir un module (pour le menu)
   */
  const canView = useCallback((module) => hasPermission(module, 'view'), [hasPermission]);
  const canCreate = useCallback((module) => hasPermission(module, 'create'), [hasPermission]);
  const canEdit = useCallback((module) => hasPermission(module, 'edit'), [hasPermission]);
  const canDelete = useCallback((module) => hasPermission(module, 'delete'), [hasPermission]);

  return (
    <PermissionsContext.Provider value={{
      permissions,
      isSuperAdmin,
      hasCustom,
      loading,
      hasPermission,
      canView,
      canCreate,
      canEdit,
      canDelete,
      reload: loadPermissions,
    }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    // Retourne des permissions libres si le contexte n'est pas disponible (dev/test)
    return {
      permissions: {},
      isSuperAdmin: true,
      loading: false,
      hasPermission: () => true,
      canView: () => true,
      canCreate: () => true,
      canEdit: () => true,
      canDelete: () => true,
      reload: () => {},
    };
  }
  return ctx;
}

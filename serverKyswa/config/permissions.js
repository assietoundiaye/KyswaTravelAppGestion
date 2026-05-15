const ROLES = Object.freeze({
  DG: 'dg',
  ADMIN: 'administrateur',
  COMPTABLE: 'comptable',
  OUMRA: 'oumra',
  COMMERCIAL: 'commercial',
  SECRETAIRE: 'secretaire',
  BILLETS: 'billets',
  ZIARA: 'ziara',
  SOCIAL: 'social',
});

const PERMISSIONS = Object.freeze({
  STATS_READ: 'stats:read',
  CLIENTS_READ: 'clients:read',
  CLIENTS_CREATE: 'clients:create',
  CLIENTS_UPDATE: 'clients:update',
  CLIENTS_DELETE: 'clients:delete',
  CLIENTS_SCAN_DOCUMENT: 'clients:scan-document',
  CLIENTS_UPLOAD_PHOTO: 'clients:upload-photo',
  MESSAGES_AUDIT_READ: 'messages:audit:read',
  PACKAGES_READ: 'packages:read',
  PACKAGES_MANAGE: 'packages:manage',
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.DG]: new Set(Object.values(PERMISSIONS)),
  [ROLES.ADMIN]: new Set(Object.values(PERMISSIONS)),
  [ROLES.COMPTABLE]: new Set([
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.PACKAGES_READ,
  ]),
  [ROLES.COMMERCIAL]: new Set([
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.CLIENTS_SCAN_DOCUMENT,
    PERMISSIONS.CLIENTS_UPLOAD_PHOTO,
    PERMISSIONS.PACKAGES_READ,
  ]),
  [ROLES.OUMRA]: new Set([
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.CLIENTS_SCAN_DOCUMENT,
    PERMISSIONS.CLIENTS_UPLOAD_PHOTO,
    PERMISSIONS.PACKAGES_READ,
  ]),
  [ROLES.BILLETS]: new Set([
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.CLIENTS_SCAN_DOCUMENT,
    PERMISSIONS.CLIENTS_UPLOAD_PHOTO,
    PERMISSIONS.PACKAGES_READ,
  ]),
  [ROLES.SECRETAIRE]: new Set([
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.CLIENTS_SCAN_DOCUMENT,
    PERMISSIONS.CLIENTS_UPLOAD_PHOTO,
    PERMISSIONS.PACKAGES_READ,
  ]),
  [ROLES.ZIARA]: new Set([
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.CLIENTS_SCAN_DOCUMENT,
    PERMISSIONS.CLIENTS_UPLOAD_PHOTO,
    PERMISSIONS.PACKAGES_READ,
  ]),
  [ROLES.SOCIAL]: new Set([
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.PACKAGES_READ,
  ]),
});

const normalizeRole = (role) => (typeof role === 'string' ? role.toLowerCase() : '');

const hasPermission = (role, permission) => {
  const normalizedRole = normalizeRole(role);
  const granted = ROLE_PERMISSIONS[normalizedRole];
  return Boolean(granted && granted.has(permission));
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  normalizeRole,
  hasPermission,
};

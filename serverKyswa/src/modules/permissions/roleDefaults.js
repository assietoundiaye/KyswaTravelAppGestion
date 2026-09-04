/**
 * @fileoverview Permissions par défaut basées sur le rôle utilisateur
 *
 * Logique : Accès = Défaut du rôle + Exceptions admin (restrictions ou extensions)
 *
 * Si l'admin n'a rien configuré → l'utilisateur garde les droits de son rôle.
 * Si l'admin a défini une exception → elle prend le dessus sur le défaut du rôle.
 */

// Rôles qui ont TOUJOURS tous les droits — jamais restreints
const SUPER_ROLES = ['dg', 'administrateur', 'informatique', 'admin'];

// Liste canonique de tous les modules
const ALL_MODULES = [
  'clients', 'reservations', 'paiements', 'visas', 'billets',
  'billets-groupe', 'comptabilite', 'desistements', 'recouvrement',
  'packages', 'rapports', 'documents', 'reunions', 'statistiques',
  'utilisateurs', 'audit', 'shop', 'simulateur', 'ziarra',
  'supplements', 'rooming'
];

/**
 * Permissions par défaut selon le rôle.
 * Format : { module: { canView, canCreate, canEdit, canDelete } }
 *
 * Ces valeurs s'appliquent quand aucune exception admin n'a été configurée.
 */
const ROLE_DEFAULT_PERMISSIONS = {
  commercial: {
    clients:       { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
    reservations:  { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
    paiements:     { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    visas:         { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    billets:       { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    'billets-groupe': { canView: true, canCreate: false, canEdit: false, canDelete: false },
    packages:      { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    rooming:       { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
    rapports:      { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    recouvrement:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    shop:          { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    simulateur:    { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    supplements:   { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    documents:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reunions:      { canView: false, canCreate: false, canEdit: false, canDelete: false },
    comptabilite:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    statistiques:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    utilisateurs:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    audit:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    desistements:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    ziarra:        { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },

  comptable: {
    clients:       { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    reservations:  { canView: true,  canCreate: false, canEdit: true,  canDelete: false },
    paiements:     { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
    comptabilite:  { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    desistements:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    recouvrement:  { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    rapports:      { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    shop:          { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    supplements:   { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    packages:      { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    rooming:       { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    billets:       { canView: false, canCreate: false, canEdit: false, canDelete: false },
    'billets-groupe': { canView: false, canCreate: false, canEdit: false, canDelete: false },
    visas:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    documents:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reunions:      { canView: false, canCreate: false, canEdit: false, canDelete: false },
    statistiques:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    utilisateurs:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    audit:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    simulateur:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
    ziarra:        { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },

  secretaire: {
    clients:       { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    reservations:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    reunions:      { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    documents:     { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    rapports:      { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    shop:          { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    supplements:   { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    packages:      { canView: false, canCreate: false, canEdit: false, canDelete: false },
    rooming:       { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    paiements:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
    visas:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    billets:       { canView: false, canCreate: false, canEdit: false, canDelete: false },
    'billets-groupe': { canView: false, canCreate: false, canEdit: false, canDelete: false },
    comptabilite:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    desistements:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    recouvrement:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    statistiques:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    utilisateurs:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    audit:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    simulateur:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
    ziarra:        { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },

  oumra: {
    clients:       { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    reservations:  { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    paiements:     { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    visas:         { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    billets:       { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    'billets-groupe': { canView: true, canCreate: true, canEdit: true, canDelete: false },
    shop:          { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    supplements:   { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    rapports:      { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    packages:      { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    rooming:       { canView: true,  canCreate: true,  canEdit: true,  canDelete: true },
    comptabilite:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    desistements:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    recouvrement:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    documents:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reunions:      { canView: false, canCreate: false, canEdit: false, canDelete: false },
    statistiques:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    utilisateurs:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    audit:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    simulateur:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
    ziarra:        { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },

  billets: {
    billets:       { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    'billets-groupe': { canView: true, canCreate: true, canEdit: true, canDelete: false },
    clients:       { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    reservations:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    reunions:      { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    shop:          { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    supplements:   { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    rapports:      { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    paiements:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
    visas:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    comptabilite:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    desistements:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    recouvrement:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    packages:      { canView: false, canCreate: false, canEdit: false, canDelete: false },
    rooming:       { canView: false, canCreate: false, canEdit: false, canDelete: false },
    documents:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
    statistiques:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    utilisateurs:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    audit:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    simulateur:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
    ziarra:        { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },

  ziara: {
    ziarra:        { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    reservations:  { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    shop:          { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    supplements:   { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    rapports:      { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    clients:       { canView: false, canCreate: false, canEdit: false, canDelete: false },
    paiements:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
    visas:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    billets:       { canView: false, canCreate: false, canEdit: false, canDelete: false },
    'billets-groupe': { canView: false, canCreate: false, canEdit: false, canDelete: false },
    comptabilite:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    desistements:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    recouvrement:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    packages:      { canView: false, canCreate: false, canEdit: false, canDelete: false },
    rooming:       { canView: false, canCreate: false, canEdit: false, canDelete: false },
    documents:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reunions:      { canView: false, canCreate: false, canEdit: false, canDelete: false },
    statistiques:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    utilisateurs:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    audit:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    simulateur:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },

  social: {
    rapports:      { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    shop:          { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    supplements:   { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    clients:       { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reservations:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    paiements:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
    visas:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    billets:       { canView: false, canCreate: false, canEdit: false, canDelete: false },
    'billets-groupe': { canView: false, canCreate: false, canEdit: false, canDelete: false },
    comptabilite:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    desistements:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    recouvrement:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    packages:      { canView: false, canCreate: false, canEdit: false, canDelete: false },
    rooming:       { canView: false, canCreate: false, canEdit: false, canDelete: false },
    documents:     { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reunions:      { canView: false, canCreate: false, canEdit: false, canDelete: false },
    statistiques:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    utilisateurs:  { canView: false, canCreate: false, canEdit: false, canDelete: false },
    audit:         { canView: false, canCreate: false, canEdit: false, canDelete: false },
    simulateur:    { canView: false, canCreate: false, canEdit: false, canDelete: false },
    ziarra:        { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
};

// Alias de rôles
ROLE_DEFAULT_PERMISSIONS.oumra_ziara = ROLE_DEFAULT_PERMISSIONS.oumra;
ROLE_DEFAULT_PERMISSIONS.voitures    = ROLE_DEFAULT_PERMISSIONS.commercial;
ROLE_DEFAULT_PERMISSIONS.immobilier  = ROLE_DEFAULT_PERMISSIONS.commercial;
ROLE_DEFAULT_PERMISSIONS.assurances  = ROLE_DEFAULT_PERMISSIONS.commercial;

/**
 * Retourne les permissions effectives d'un utilisateur :
 * 1. Commence avec les défauts du rôle
 * 2. Applique les exceptions admin stockées en base (peuvent restreindre ou étendre)
 *
 * @param {string} role - Rôle de l'utilisateur
 * @param {Array}  records - Enregistrements permissions_modules depuis Prisma
 * @returns {Object} Map { module -> { canView, canCreate, canEdit, canDelete } }
 */
function computeEffectivePermissions(role, records) {
  // 1. Partir des défauts du rôle (ou aucun accès si rôle inconnu)
  const normRole = (role || '').toLowerCase();
  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[normRole] || {};
  const result = {};

  for (const mod of ALL_MODULES) {
    result[mod] = roleDefaults[mod]
      ? { ...roleDefaults[mod] }
      : { canView: false, canCreate: false, canEdit: false, canDelete: false };
  }

  // 2. Appliquer les exceptions admin (écrasent les défauts du rôle)
  for (const r of records) {
    if (ALL_MODULES.includes(r.module)) {
      result[r.module] = {
        canView:   r.can_view   ?? false,
        canCreate: r.can_create ?? false,
        canEdit:   r.can_edit   ?? false,
        canDelete: r.can_delete ?? false,
      };
    }
  }

  return result;
}

/**
 * Retourne les défauts du rôle pour affichage dans la modal admin
 * (pour pré-remplir la modal avec l'état actuel du rôle)
 */
function getRoleDefaults(role) {
  const normRole = (role || '').toLowerCase();
  return ROLE_DEFAULT_PERMISSIONS[normRole] || null;
}

module.exports = {
  SUPER_ROLES,
  ALL_MODULES,
  ROLE_DEFAULT_PERMISSIONS,
  computeEffectivePermissions,
  getRoleDefaults,
};

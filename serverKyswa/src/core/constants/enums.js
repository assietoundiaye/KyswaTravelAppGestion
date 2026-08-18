/**
 * @fileoverview Énumérations centralisées pour Kyswa Travel
 * Utilisée par tous les modules métier
 */

// ─────────────────────────────────────────────────────────
// RÔLES UTILISATEUR
// ─────────────────────────────────────────────────────────
const ROLES = {
  DG: 'dg',
  ADMINISTRATEUR: 'administrateur',
  COMPTABLE: 'comptable',
  OUMRA: 'oumra',
  COMMERCIAL: 'commercial',
  SECRETAIRE: 'secretaire',
  BILLETS: 'billets',
  ZIARA: 'ziara',
  SOCIAL: 'social',
};

const ROLE_DESCRIPTIONS = {
  [ROLES.DG]: 'Directeur Général',
  [ROLES.ADMINISTRATEUR]: 'Administrateur Système',
  [ROLES.COMPTABLE]: 'Comptable',
  [ROLES.OUMRA]: 'Agent Oumra',
  [ROLES.COMMERCIAL]: 'Commercial',
  [ROLES.SECRETAIRE]: 'Secrétaire',
  [ROLES.BILLETS]: 'Agent Billets',
  [ROLES.ZIARA]: 'Agent Ziarra',
  [ROLES.SOCIAL]: 'Agent Social',
};

// ─────────────────────────────────────────────────────────
// ÉTATS UTILISATEUR
// ─────────────────────────────────────────────────────────
const USER_STATUS = {
  ACTIF: 'ACTIF',
  INACTIF: 'INACTIF',
};

// ─────────────────────────────────────────────────────────
// RÉSERVATIONS
// ─────────────────────────────────────────────────────────
const RESERVATION_STATUSES = {
  INSCRIT: 'INSCRIT',
  CONFIRME: 'CONFIRME',
  DESISTE: 'DESISTE',
  PARTI: 'PARTI',
  RENTRE: 'RENTRE',
  ANNULE: 'ANNULE',
};

const PAYMENT_STATUSES = {
  EN_ATTENTE: 'EN_ATTENTE',
  PARTIEL: 'PARTIEL',
  SOLDE: 'SOLDE',
};

const ROOM_TYPES = {
  SINGLE: 'SINGLE',
  DOUBLE: 'DOUBLE',
  TRIPLE: 'TRIPLE',
  QUADRUPLE: 'QUADRUPLE',
  SUITE: 'SUITE',
};

// ─────────────────────────────────────────────────────────
// PACKAGES
// ─────────────────────────────────────────────────────────
const PACKAGE_TYPES = {
  OUMRA: 'OUMRA',
  HAJJ: 'HAJJ',
  ZIAR_FES: 'ZIAR_FES',
  ZIARRA: 'ZIARRA',
  TOURISME: 'TOURISME',
  BILLET: 'BILLET',
};

const PACKAGE_STATUSES = {
  OUVERT: 'OUVERT',
  COMPLET: 'COMPLET',
  ANNULE: 'ANNULE',
  TERMINE: 'TERMINE',
};

// ─────────────────────────────────────────────────────────
// PAIEMENTS
// ─────────────────────────────────────────────────────────
const PAYMENT_MODES = {
  ESPECES: 'ESPECES',
  VIREMENT: 'VIREMENT',
  CHEQUE: 'CHEQUE',
  CARTE_BANCAIRE: 'CARTE_BANCAIRE',
  ORANGE_MONEY: 'ORANGE_MONEY',
  WAVE: 'WAVE',
  MONEY: 'MONEY',
  AUTRE: 'AUTRE',
};

// ─────────────────────────────────────────────────────────
// VISAS
// ─────────────────────────────────────────────────────────
const VISA_STATUSES = {
  EN_ATTENTE: 'EN_ATTENTE',
  ENVOYE: 'ENVOYE',
  RECU: 'RECU',
  REFUSE: 'REFUSE',
};

// ─────────────────────────────────────────────────────────
// FIDÉLITÉ CLIENT
// ─────────────────────────────────────────────────────────
const LOYALTY_LEVELS = {
  BRONZE: 'BRONZE',
  ARGENT: 'ARGENT',
  OR: 'OR',
  PLATINE: 'PLATINE',
};

// ─────────────────────────────────────────────────────────
// ACTIONS AUDIT
// ─────────────────────────────────────────────────────────
const AUDIT_ACTIONS = {
  CONNEXION: 'CONNEXION',
  DECONNEXION: 'DECONNEXION',
  CREATION: 'CREATION',
  MODIFICATION: 'MODIFICATION',
  SUPPRESSION: 'SUPPRESSION',
};

module.exports = {
  ROLES,
  ROLE_DESCRIPTIONS,
  USER_STATUS,
  RESERVATION_STATUSES,
  PAYMENT_STATUSES,
  ROOM_TYPES,
  PACKAGE_TYPES,
  PACKAGE_STATUSES,
  PAYMENT_MODES,
  VISA_STATUSES,
  LOYALTY_LEVELS,
  AUDIT_ACTIONS,
};

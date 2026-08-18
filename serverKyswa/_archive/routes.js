/**
 * Enregistrement centralisé de toutes les routes API.
 * Chaque route est montée avec son préfixe et ses middlewares.
 */

const { auditMiddleware } = require('../middleware/audit');

module.exports = function registerRoutes(app) {
  // ── Routes publiques (sans authentification) ──────────────────────────────
  app.use('/api/public',    require('../routes/public'));
  app.use('/api/auth',      require('../routes/auth'));

  // ── Profil & utilisateurs ─────────────────────────────────────────────────
  app.use('/api/users',     auditMiddleware, require('../routes/users'));
  app.use('/api/profile',   auditMiddleware, require('../routes/profile'));

  // ── Clients ───────────────────────────────────────────────────────────────
  app.use('/api/clients',   auditMiddleware, require('../routes/clients'));

  // ═══════════════════════════════════════════════════════════════════════════
  // MIGRATION PostgreSQL : Routes temporairement désactivées
  // Ces routes seront réactivées progressivement après conversion Prisma
  // ═══════════════════════════════════════════════════════════════════════════
  
  // ── Packages & suppléments ────────────────────────────────────────────────
  app.use('/api/packages',     auditMiddleware, require('../routes/packages')); // ✅ CONVERTI
  
  /*
  app.use('/api/supplements',  auditMiddleware, require('../routes/supplements'));

  // ── Réservations & paiements ──────────────────────────────────────────────
  app.use('/api/reservations', auditMiddleware, require('../routes/reservations'));
  // Paiements montés sur /api pour conserver les chemins /api/reservations/:id/paiements
  app.use('/api',              auditMiddleware, require('../routes/paiements'));

  // ── Billets ───────────────────────────────────────────────────────────────
  app.use('/api/billets',        auditMiddleware, require('../routes/billets'));
  app.use('/api/billets-groupe', auditMiddleware, require('../routes/billetsGroupe'));

  // ── Documents & factures ──────────────────────────────────────────────────
  app.use('/api/documents', auditMiddleware, require('../routes/documents'));
  app.use('/api/factures',  require('../routes/factures'));

  // ── Messagerie & audit ────────────────────────────────────────────────────
  app.use('/api/messages',  require('../routes/messages'));

  // ── Statistiques & export ─────────────────────────────────────────────────
  app.use('/api/stats',  require('../routes/stats'));
  app.use('/api/export', require('../routes/export'));

  // ── Modules métier ────────────────────────────────────────────────────────
  app.use('/api/visas',         auditMiddleware, require('../routes/visas'));
  app.use('/api/desistements',  auditMiddleware, require('../routes/desistements'));
  app.use('/api/recouvrement',  auditMiddleware, require('../routes/recouvrement'));
  app.use('/api/reunions',      auditMiddleware, require('../routes/reunions'));
  app.use('/api/bilan',         require('../routes/bilan'));
  app.use('/api/ziarra',        auditMiddleware, require('../routes/ziarra'));
  app.use('/api/comptabilite',  auditMiddleware, require('../routes/comptabilite'));
  app.use('/api/rapports',      auditMiddleware, require('../routes/rapports'));
  app.use('/api/shop',          auditMiddleware, require('../routes/shop'));
  */

  // ── Routes de test (dev uniquement) ──────────────────────────────────────
  app.use('/api/test', require('../routes/test'));
};

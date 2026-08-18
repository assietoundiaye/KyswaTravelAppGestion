/**
 * @fileoverview Routes pour les Clients
 * Injection de dépendances
 */

const express = require('express');
const ClientController = require('./controllers/ClientController');
const ClientRepository = require('./repositories/ClientRepository');
const ClientService = require('./services/ClientService');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

/**
 * Factory fonction : créer les routes avec DI
 * @param {Object} dependencies - {clientModel, auditService}
 * @returns {express.Router}
 */
function createClientRoutes(dependencies) {
  const { clientModel, auditService } = dependencies;
  const router = express.Router();

  // ─────────────────────────────────────────────────────
  // INJECTION DE DÉPENDANCES
  // ─────────────────────────────────────────────────────
  // ClientRepository gère directement prisma.clients (Supabase)
  const repository = new ClientRepository();
  const service = new ClientService(repository, auditService);
  const controller = new ClientController(service);

  // ─────────────────────────────────────────────────────
  // ROUTES PUBLIQUES (lecture)
  // ─────────────────────────────────────────────────────

  // GET tous les clients
  router.get('/', protect, checkPermission('clients', 'view'), (req, res, next) => controller.getAll(req, res, next));

  // GET clients par agent
  router.get('/agent/:agentId', protect, checkPermission('clients', 'view'), (req, res, next) =>
    controller.getByAgent(req, res, next)
  );

  // GET un client par ID
  router.get('/id/:id', protect, checkPermission('clients', 'view'), (req, res, next) => controller.getById(req, res, next));

  // GET statistiques
  router.get('/stats', protect, checkPermission('clients', 'view'), (req, res, next) => controller.getStats(req, res, next));

  // GET recherche
  router.get('/search', protect, checkPermission('clients', 'view'), (req, res, next) => controller.search(req, res, next));

  // GET un client par ID (route standard — doit être APRÈS les routes fixes pour éviter les conflits)
  router.get('/:id', protect, checkPermission('clients', 'view'), (req, res, next) => controller.getById(req, res, next));

  // ─────────────────────────────────────────────────────
  // ROUTES PROTÉGÉES (écriture)
  // ─────────────────────────────────────────────────────

  // POST créer client
  router.post('/', protect, checkPermission('clients', 'create'), (req, res, next) => controller.create(req, res, next));

  // PATCH modifier client
  router.patch('/:id', protect, checkPermission('clients', 'edit'), (req, res, next) => controller.update(req, res, next));

  // DELETE client (soft delete)
  router.delete('/:id', protect, checkPermission('clients', 'delete'), (req, res, next) =>
    controller.delete(req, res, next)
  );

  // ─────────────────────────────────────────────────────
  // ROUTES FIDÉLITÉ
  // ─────────────────────────────────────────────────────

  // POST promouvoir client
  router.post('/:id/loyalty/promote', protect, requireRole('commercial', 'dg'), (req, res, next) =>
    controller.promoteLoyalty(req, res, next)
  );

  // POST rétrograder client
  router.post('/:id/loyalty/demote', protect, requireRole('commercial', 'dg'), (req, res, next) =>
    controller.demoteLoyalty(req, res, next)
  );

  // ─────────────────────────────────────────────────────
  // ROUTES VISAS ET VOYAGES
  // ─────────────────────────────────────────────────────

  // POST ajouter visa
  router.post('/:id/visa', protect, (req, res, next) => controller.addVisa(req, res, next));

  // POST ajouter voyage
  router.post('/:id/voyage', protect, (req, res, next) => controller.addVoyage(req, res, next));

  return router;
}

module.exports = createClientRoutes;

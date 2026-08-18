/**
 * @fileoverview Routes pour les Suppléments
 */

const express = require('express');
const SupplementController = require('./controllers/SupplementController');
const SupplementRepository = require('./repositories/SupplementRepository');
const SupplementService = require('./services/SupplementService');
const { protect } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

/**
 * Factory fonction : créer les routes avec DI
 */
function createSupplementRoutes(dependencies) {
  const { auditService } = dependencies;
  const router = express.Router();

  // ─────────────────────────────────────────────────────
  // INJECTION DE DÉPENDANCES
  // ─────────────────────────────────────────────────────
  const repository = new SupplementRepository();
  const service = new SupplementService(repository, auditService);
  const controller = new SupplementController(service);

  // ─────────────────────────────────────────────────────
  // ROUTES PUBLIQUES (lecture)
  // ─────────────────────────────────────────────────────

  // GET tous les suppléments
  router.get('/', protect, checkPermission('supplements', 'view'), (req, res, next) =>
    controller.getAll(req, res, next)
  );

  // GET suppléments actifs seulement
  router.get('/active', protect, checkPermission('supplements', 'view'), (req, res, next) =>
    controller.getActive(req, res, next)
  );

  // GET un supplément par ID
  router.get('/:id', protect, checkPermission('supplements', 'view'), (req, res, next) =>
    controller.getById(req, res, next)
  );

  // ─────────────────────────────────────────────────────
  // ROUTES PROTÉGÉES (écriture)
  // ─────────────────────────────────────────────────────

  // POST créer supplément
  router.post('/', protect, checkPermission('supplements', 'create'), (req, res, next) =>
    controller.create(req, res, next)
  );

  // PATCH modifier supplément
  router.patch('/:id', protect, checkPermission('supplements', 'edit'), (req, res, next) =>
    controller.update(req, res, next)
  );

  // DELETE supplément
  router.delete('/:id', protect, checkPermission('supplements', 'delete'), (req, res, next) =>
    controller.delete(req, res, next)
  );

  // PUT activer/désactiver supplément
  router.put('/:id/toggle', protect, checkPermission('supplements', 'edit'), (req, res, next) =>
    controller.toggleActive(req, res, next)
  );

  return router;
}

module.exports = createSupplementRoutes;
/**
 * @fileoverview Routes — Module audit
 */
const express = require('express');
const AuditRepository = require('./repositories/AuditRepository');
const { protect, requireRole } = require('../../core/middleware/auth');

function createAuditRoutes(dependencies) {
  const router = express.Router();
  const repository = new AuditRepository();

  // GET liste avec filtres (action, module, search)
  router.get('/', protect, async (req, res, next) => {
    try {
      const { page = 1, limit = 200, action, module, search } = req.query;
      const result = await repository.findFiltered(
        { action, module, search },
        { page: +page, limit: +limit }
      );
      res.json({
        success: true,
        logs: result.data,
        data: result.data,
        total: result.total,
        audit_logs: result.data,
      });
    } catch (e) { next(e); }
  });

  // GET récents (pour dashboard)
  router.get('/recents', protect, async (req, res, next) => {
    try {
      const { limit = 50 } = req.query;
      const data = await repository.findRecents(+limit);
      res.json({ success: true, logs: data, data });
    } catch (e) { next(e); }
  });

  // GET par ID
  router.get('/:id', protect, async (req, res, next) => {
    try {
      const item = await repository.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Non trouvé' });
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // POST créer manuellement (rarement utilisé — les actions sont loggées côté service)
  router.post('/', protect, async (req, res, next) => {
    try {
      const item = await repository.log(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // DELETE supprimer
  router.delete('/:id', protect, requireRole('admin', 'dg', 'informatique'), async (req, res, next) => {
    try {
      await repository.deleteById(req.params.id);
      res.json({ success: true, message: 'Supprimé avec succès' });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = createAuditRoutes;

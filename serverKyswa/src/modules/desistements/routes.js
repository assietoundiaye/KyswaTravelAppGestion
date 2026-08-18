/**
 * @fileoverview Routes — Module desistements
 */
const express = require('express');
const DesistementRepository = require('./repositories/DesistementRepository');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

function createDesistementsRoutes(dependencies) {
  const router = express.Router();
  const repository = new DesistementRepository();


  // GET liste (paginée)
  router.get('/', protect, checkPermission('desistements', 'view'), async (req, res, next) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const result = await repository.findMany({}, { page: +page, limit: +limit });
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        desistements: result.data,
        departs: result.data,
        profiles: result.data
      });
    } catch (e) { next(e); }
  });

  // GET par ID
  router.get('/:id', protect, checkPermission('desistements', 'view'), async (req, res, next) => {
    try {
      const item = await repository.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Non trouvé' });
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // POST créer
  router.post('/', protect, checkPermission('desistements', 'create'), async (req, res, next) => {
    try {
      const item = await repository.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // PATCH mettre à jour
  router.patch('/:id', protect, checkPermission('desistements', 'edit'), async (req, res, next) => {
    try {
      const item = await repository.updateById(req.params.id, req.body);
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // DELETE supprimer
  router.delete('/:id', protect, checkPermission('desistements', 'delete'), async (req, res, next) => {
    try {
      await repository.deleteById(req.params.id);
      res.json({ success: true, message: 'Supprimé avec succès' });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = createDesistementsRoutes;

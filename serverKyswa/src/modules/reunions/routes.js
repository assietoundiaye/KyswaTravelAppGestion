/**
 * @fileoverview Routes — Module reunions
 */
const express = require('express');
const BaseRepository = require('../../shared/decorators/BaseRepository');
const prismaClient = require('../../database/client');
const { protect } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

function createReunionsRoutes() {
  const router = express.Router();
  const repo = new BaseRepository(prismaClient.reunions);

  router.get('/', protect, checkPermission('reunions', 'view'), async (req, res, next) => {
    try {
      const result = await repo.findMany({}, { limit: 50 });
      res.json({ success: true, reunions: result.data, data: result.data });
    } catch (e) { next(e); }
  });

  router.get('/:id', protect, checkPermission('reunions', 'view'), async (req, res, next) => {
    try {
      const item = await repo.findById(req.params.id);
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = createReunionsRoutes;

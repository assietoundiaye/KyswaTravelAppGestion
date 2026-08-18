const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const exportService = require('../services/exportService');

router.use(protect);
router.use(requireRole('administrateur', 'dg', 'comptable'));

/**
 * GET /api/export/clients
 */
router.get('/clients', async (req, res) => {
  try {
    const csv = await exportService.exporterClients();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ message: 'Erreur export' });
  }
});

/**
 * GET /api/export/reservations
 */
router.get('/reservations', async (req, res) => {
  try {
    const csv = await exportService.exporterReservations();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reservations.csv"');
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ message: 'Erreur export' });
  }
});

/**
 * GET /api/export/billets
 */
router.get('/billets', async (req, res) => {
  try {
    const csv = await exportService.exporterBillets();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="billets.csv"');
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ message: 'Erreur export' });
  }
});

module.exports = router;

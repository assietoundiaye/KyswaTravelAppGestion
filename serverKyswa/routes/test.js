const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');

router.get('/admin-only', protect, requireRole('ADMIN'), (req, res) => {
  res.json({ message: `Bienvenue ${req.user.prenom} (${req.user.role})` });
});

router.get('/commercial-or-comptable', protect, requireRole('COMMERCIAL', 'COMPTABLE'), (req, res) => {
  res.json({ message: `Accès OK pour ${req.user.role}` });
});

module.exports = router;

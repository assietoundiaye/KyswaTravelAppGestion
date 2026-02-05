const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');

// Toutes les routes ici sont protégées
router.use(protect);

/**
 * GET /api/clients
 * Liste des clients (tous les rôles internes peuvent voir)
 * Query params optionnels: ?search=nom&?passeport=
 */
router.get('/', async (req, res) => {
  try {
    const { search, passeport } = req.query;
    const filter = {};

    if (passeport) filter.numeroPasseport = passeport;

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [ { nom: regex }, { prenom: regex }, { telephone: regex }, { email: regex } ];
    }

    const clients = await Client.find(filter)
      .select('numeroPasseport nom prenom telephone email dateCreation')
      .sort({ dateCreation: -1 });

    return res.status(200).json({ count: clients.length, clients });
  } catch (err) {
    console.error('Erreur récupération clients:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des clients' });
  }
});

module.exports = router;

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Client = require('../models/Client');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

/**
 * Neutralise les caractères spéciaux pour éviter les attaques ReDoS
 */
const escapeRegExp = (str) => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

router.use(protect);

/**
 * GET /api/clients
 */
router.get('/', async (req, res) => {
  try {
    const { search, passeport } = req.query;
    const filter = {};

    if (passeport) {
      filter.numeroPasseport = typeof passeport === 'string' ? passeport : String(passeport);
    }

    if (search && typeof search === 'string') {
      const regex = new RegExp(escapeRegExp(search), 'i');
      filter.$or = [
        { nom: regex },
        { prenom: regex },
        { telephone: regex },
        { email: regex },
      ];
    } else if (search) {
      return res.status(400).json({ message: 'Le format de recherche est invalide.' });
    }

    const clients = await Client.find(filter)
      .select('numeroPasseport nom prenom telephone email dateCreation')
      .sort({ dateCreation: -1 })
      .limit(100);

    return res.status(200).json({ count: clients.length, clients });
  } catch (err) {
    console.error('Erreur récupération clients:', err);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

/**
 * POST /api/clients
 */
router.post(
  '/',
  [
    body('nomComplet').optional().trim().isLength({ min: 3 }).withMessage('nomComplet doit contenir au moins 3 caractères'),
    body('nom').optional().trim().isLength({ min: 2 }).withMessage('nom doit contenir au moins 2 caractères'),
    body('prenom').optional().trim().isLength({ min: 2 }).withMessage('prenom doit contenir au moins 2 caractères'),
    body('telephone').optional().trim(),
    body('email').optional().trim().isEmail().withMessage('Email invalide'),
    body('numeroPasseport').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let { nomComplet, nom, prenom, telephone, email, numeroPasseport } = req.body;

      if (nomComplet && !nom && !prenom) {
        const parts = nomComplet.trim().split(/\s+/);
        if (parts.length >= 2) {
          nom = parts[0];
          prenom = parts.slice(1).join(' ');
        } else {
          prenom = parts[0];
          nom = 'Client';
        }
      }

      if (!numeroPasseport) {
        numeroPasseport = `PP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      }

      const client = new Client({
        numeroPasseport,
        nom,
        prenom,
        telephone: telephone || undefined,
        email: email || undefined,
        creeParUtilisateurId: req.user.id,
      });

      await client.save();

      return res.status(201).json({ message: 'Client créé', data: client });
    } catch (err) {
      console.error('Erreur création client:', err);
      if (err.code === 11000) {
        return res.status(409).json({ message: 'Ce numéro de passeport existe déjà' });
      }
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message).join(', ');
        return res.status(400).json({ message: messages });
      }
      return res.status(500).json({ message: 'Erreur serveur interne' });
    }
  }
);

/**
 * GET /api/clients/:id
 * Détail d'un client avec ses documents
 */
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }

    const documents = await Document.find({ clientId: req.params.id });

    return res.status(200).json({ client, documents });
  } catch (err) {
    console.error('Erreur récupération client:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération du client' });
  }
});

module.exports = router;

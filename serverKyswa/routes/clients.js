const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');

/**
 * Neutralise les caractères spéciaux pour éviter les attaques ReDoS
 * (Regular Expression Denial of Service)
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

router.use(protect);

/**
 * GET /api/clients
 * Recherche sécurisée par type et contenu
 */
router.get('/', async (req, res) => {
  try {
    const { search, passeport } = req.query;
    const filter = {};

    // Sécurisation du paramètre passeport (conversion forcée en string)
    if (passeport) {
      filter.numeroPasseport = typeof passeport === 'string' ? passeport : String(passeport);
    }

    // Correction Snyk : Vérification stricte du TYPE de 'search'
    if (search && typeof search === 'string') {
      
      // 1. Échappement des caractères spéciaux
      const safeSearch = escapeRegExp(search);
      
      // 2. Création de la Regex (insensible à la casse)
      const regex = new RegExp(safeSearch, 'i');
      
      filter.$or = [ 
        { nom: regex }, 
        { prenom: regex }, 
        { telephone: regex }, 
        { email: regex } 
      ];
    } else if (search) {
      // Si search existe mais n'est pas une string (ex: un objet), on ignore ou on renvoie une erreur
      return res.status(400).json({ message: "Le format de recherche est invalide." });
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
 * Créer un nouveau client
 */
router.post(
  '/',
  [
    body('nomComplet')
      .optional()
      .trim()
      .notEmpty().withMessage('nomComplet est requis')
      .isLength({ min: 3 }).withMessage('nomComplet doit contenir au moins 3 caractères'),
    body('nom')
      .optional()
      .trim()
      .notEmpty().withMessage('nom est requis')
      .isLength({ min: 2 }).withMessage('nom doit contenir au moins 2 caractères'),
    body('prenom')
      .optional()
      .trim()
      .notEmpty().withMessage('prenom est requis')
      .isLength({ min: 2 }).withMessage('prenom doit contenir au moins 2 caractères'),
    body('telephone')
      .optional()
      .trim(),
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Email invalide'),
    body('numeroPasseport')
      .optional()
      .trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let { nomComplet, nom, prenom, telephone, email, numeroPasseport } = req.body;

      // Si nomComplet est fourni, l'utiliser pour générer nom et prenom
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

      // Générer un numeroPasseport unique s'il n'en est pas fourni
      if (!numeroPasseport) {
        numeroPasseport = `PP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      }

      // Créer le client
      const client = new Client({
        numeroPasseport,
        nom,
        prenom,
        telephone: telephone || undefined,
        email: email || undefined,
        creeParUtilisateurId: req.user.id,
      });

      await client.save();

      return res.status(201).json({
        message: 'Client créé',
        data: client,
      });
    } catch (err) {
      console.error('Erreur création client:', err);
      if (err.code === 11000) {
        return res.status(409).json({ message: 'Ce numéro de passeport existe déjà' });
      }
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors)
          .map(e => e.message)
          .join(', ');
        return res.status(400).json({ message: messages });
      }
      return res.status(500).json({ message: 'Erreur serveur interne' });
    }
  }
);

/**
 * GET /api/clients/:id
 * Détail d'un client
 */
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('documents');

    if (!client) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }

    return res.status(200).json({ client });
  } catch (err) {
    console.error('Erreur récupération client:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération du client' });
  }
});

module.exports = router;
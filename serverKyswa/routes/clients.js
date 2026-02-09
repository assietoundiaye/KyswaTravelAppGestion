const express = require('express');
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

module.exports = router;
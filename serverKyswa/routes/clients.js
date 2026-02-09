const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');

// Fonction utilitaire pour neutraliser les caractères spéciaux des Regex
// Cela empêche un utilisateur d'envoyer des commandes comme (a+)+
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { search, passeport } = req.query;
    const filter = {};

    if (passeport) filter.numeroPasseport = String(passeport);

    if (search) {
      // 1. On transforme l'entrée en string pour éviter les injections d'objets
      // 2. On échappe les caractères spéciaux pour contrer le ReDoS
      const safeSearch = escapeRegExp(String(search));
      
      // 3. On crée la Regex de manière sécurisée
      const regex = new RegExp(safeSearch, 'i');
      
      filter.$or = [ 
        { nom: regex }, 
        { prenom: regex }, 
        { telephone: regex }, 
        { email: regex } 
      ];
    }

    const clients = await Client.find(filter)
      .select('numeroPasseport nom prenom telephone email dateCreation')
      .sort({ dateCreation: -1 })
      .limit(100); // Bonne pratique : limiter le nombre de résultats

    return res.status(200).json({ count: clients.length, clients });
  } catch (err) {
    console.error('Erreur récupération clients:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
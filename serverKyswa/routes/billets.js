const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Billet = require('../models/Billet');
const Client = require('../models/Client');
const Document = require('../models/Document');
// s'assurer que le modèle Paiement est enregistré pour les populates
require('../models/Paiement');
const { protect, requireRole } = require('../middleware/auth');

// Protéger toutes les routes : COMMERCIAL, GESTIONNAIRE, COMPTABLE
router.use(protect);
router.use(requireRole('commercial', 'oumra', 'billets', 'comptable', 'administrateur', 'dg'));

/**
 * POST /api/billets
 * Créer un billet d'avion
 */
router.post(
  '/',
  [
    body('numeroBillet')
      .trim()
      .notEmpty().withMessage('numeroBillet est requis')
      .isLength({ min: 1 }).withMessage('numeroBillet doit contenir au moins 1 caractère'),
    body('compagnie')
      .trim()
      .notEmpty().withMessage('compagnie est requise')
      .isLength({ min: 2 }).withMessage('compagnie doit contenir au moins 2 caractères'),
    body('classe')
      .trim()
      .notEmpty().withMessage('classe est requise'),
    body('destination')
      .trim()
      .notEmpty().withMessage('destination est requise'),
    body('typeBillet')
      .trim()
      .notEmpty().withMessage('typeBillet est requis')
      .isIn(['aller_simple', 'aller_retour']).withMessage('typeBillet doit être "aller_simple" ou "aller_retour"'),
    body('dateDepart')
      .isISO8601().withMessage('dateDepart doit être une date valide (ISO 8601)'),
    body('dateArrivee')
      .isISO8601().withMessage('dateArrivee doit être une date valide (ISO 8601)'),
    body('dateArrivee')
      .custom((value, { req }) => {
        const dateDepart = new Date(req.body.dateDepart);
        const dateArrivee = new Date(value);
        if (dateArrivee <= dateDepart) {
          throw new Error('dateArrivee doit être après dateDepart');
        }
        return true;
      }),
    body('prix')
      .isFloat({ min: 0 }).withMessage('prix doit être un nombre positif'),
    body('clientId')
      .trim()
      .notEmpty().withMessage('clientId est requis')
      .isMongoId().withMessage('clientId doit être un ID Mongo valide')
      .custom(async (value) => {
        const client = await Client.findById(value);
        if (!client) {
          throw new Error('Client non trouvé');
        }
      }),
    body('statut')
      .optional()
      .trim()
      .isIn(['ACTIF', 'ANNULE']).withMessage('statut doit être "ACTIF" ou "ANNULE"'),
  ],
  async (req, res) => {
    try {
      // Vérifier erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { numeroBillet, compagnie, classe, destination, typeBillet, dateDepart, dateArrivee, prix, clientId, statut } = req.body;

      // Créer le billet
      const billet = new Billet({
        idBillet: Date.now(),
        numeroBillet,
        compagnie,
        classe,
        destination,
        typeBillet,
        dateDepart,
        dateArrivee,
        prix,
        statut: statut || 'ACTIF',
        clientId,
        paiements: [],
      });

      await billet.save();
      await billet.populate('clientId', 'nom prenom numeroPasseport');

      return res.status(201).json({
        message: 'Billet créé avec succès',
        billet,
      });
    } catch (err) {
      console.error('Erreur création billet:', err);
      return res.status(500).json({ message: 'Erreur lors de la création du billet' });
    }
  }
);

/**
 * GET /api/billets
 * Liste tous les billets
 */
router.get('/', async (req, res) => {
  try {
    const billets = await Billet.find()
      .populate('clientId', 'nom prenom numeroPasseport email')
      .populate('paiements', 'idPaiement montant mode dateReglement')
      .sort({ dateDepart: -1 });

    return res.status(200).json({
      count: billets.length,
      billets,
    });
  } catch (err) {
    console.error('Erreur récupération billets:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des billets' });
  }
});

/**
 * GET /api/billets/:id
 * Détail d'un billet
 */
router.get('/:id', async (req, res) => {
  try {
    const billet = await Billet.findById(req.params.id)
      .populate('clientId', 'nom prenom numeroPasseport email telephone')
      .populate('paiements', 'idPaiement montant mode dateReglement');

    if (!billet) {
      return res.status(404).json({ message: 'Billet non trouvé' });
    }

    const documents = await Document.find({ billetId: req.params.id });

    return res.status(200).json({ billet, documents });
  } catch (err) {
    console.error('Erreur récupération billet:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération du billet' });
  }
});

/**
 * PATCH /api/billets/:id
 * Modifier un billet (sauf idBillet et clientId)
 */
router.patch(
  '/:id',
  [
    body('numeroBillet')
      .optional()
      .trim()
      .isLength({ min: 1 }).withMessage('numeroBillet doit contenir au moins 1 caractère'),
    body('compagnie')
      .optional()
      .trim()
      .isLength({ min: 2 }).withMessage('compagnie doit contenir au moins 2 caractères'),
    body('classe')
      .optional()
      .trim(),
    body('destination')
      .optional()
      .trim(),
    body('typeBillet')
      .optional()
      .trim()
      .isIn(['aller_simple', 'aller_retour']).withMessage('typeBillet doit être "aller_simple" ou "aller_retour"'),
    body('dateDepart')
      .optional()
      .isISO8601().withMessage('dateDepart doit être une date valide (ISO 8601)'),
    body('dateArrivee')
      .optional()
      .isISO8601().withMessage('dateArrivee doit être une date valide (ISO 8601)'),
    body('dateArrivee')
      .optional()
      .custom((value, { req }) => {
        const dateDepart = req.body.dateDepart || req.billet?.dateDepart;
        if (value && dateDepart) {
          const newDateDepart = new Date(dateDepart);
          const newDateArrivee = new Date(value);
          if (newDateArrivee <= newDateDepart) {
            throw new Error('dateArrivee doit être après dateDepart');
          }
        }
        return true;
      }),
    body('prix')
      .optional()
      .isFloat({ min: 0 }).withMessage('prix doit être un nombre positif'),
    body('statut')
      .optional()
      .trim()
      .isIn(['ACTIF', 'ANNULE']).withMessage('statut doit être "ACTIF" ou "ANNULE"'),
  ],
  async (req, res) => {
    try {
      // Vérifier erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { numeroBillet, compagnie, classe, destination, typeBillet, dateDepart, dateArrivee, prix, statut } = req.body;

      const billet = await Billet.findById(req.params.id);
      if (!billet) {
        return res.status(404).json({ message: 'Billet non trouvé' });
      }

      // Vérifier dateArrivee > dateDepart si les deux sont modifiés
      if (dateDepart && dateArrivee) {
        const newDateDepart = new Date(dateDepart);
        const newDateArrivee = new Date(dateArrivee);
        if (newDateArrivee <= newDateDepart) {
          return res.status(400).json({ message: 'La date d\'arrivée doit être après la date de départ' });
        }
      }

      // Mise à jour des champs autorisés
      if (numeroBillet !== undefined) billet.numeroBillet = numeroBillet;
      if (compagnie !== undefined) billet.compagnie = compagnie;
      if (classe !== undefined) billet.classe = classe;
      if (destination !== undefined) billet.destination = destination;
      if (typeBillet !== undefined) billet.typeBillet = typeBillet;
      if (dateDepart !== undefined) billet.dateDepart = dateDepart;
      if (dateArrivee !== undefined) billet.dateArrivee = dateArrivee;
      if (prix !== undefined) billet.prix = prix;
      if (statut !== undefined) billet.statut = statut;

      await billet.save();
      await billet.populate('clientId', 'nom prenom numeroPasseport');

      return res.status(200).json({
        message: 'Billet modifié avec succès',
        billet,
      });
    } catch (err) {
      console.error('Erreur modification billet:', err);
      return res.status(500).json({ message: 'Erreur lors de la modification du billet' });
    }
  }
);

/**
 * DELETE /api/billets/:id
 * Supprimer ou annuler un billet (passer statut à ANNULE)
 */
router.delete('/:id', async (req, res) => {
  try {
    const billet = await Billet.findById(req.params.id);
    if (!billet) {
      return res.status(404).json({ message: 'Billet non trouvé' });
    }

    // Passer le statut à ANNULE au lieu de supprimer
    billet.statut = 'ANNULE';
    await billet.save();

    return res.status(200).json({
      message: 'Billet annulé avec succès',
      billet: {
        idBillet: billet.idBillet,
        numeroBillet: billet.numeroBillet,
        statut: billet.statut,
      },
    });
  } catch (err) {
    console.error('Erreur suppression billet:', err);
    return res.status(500).json({ message: 'Erreur lors de l\'annulation du billet' });
  }
});

module.exports = router;

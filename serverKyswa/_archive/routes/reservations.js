const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const reservationService = require('../services/reservationService');
const Client = require('../models/Client');
const PackageK = require('../models/PackageK');
const Supplement = require('../models/Supplement');
const { protect, requireRole } = require('../middleware/auth');
const { cacheReservations, invalidateReservations } = require('../middleware/cache');

// Protection: COMMERCIAL, GESTIONNAIRE et COMPTABLE
router.use(protect);
router.use(requireRole('commercial', 'oumra', 'billets', 'comptable', 'administrateur', 'dg', 'secretaire'));

/**
 * POST /api/reservations
 * Créer une réservation
 */
router.post(
  '/',
  invalidateReservations, // Invalider le cache après création
  [
    body('packageKId')
      .trim()
      .notEmpty().withMessage('packageKId est requis')
      .isMongoId().withMessage('packageKId doit être un ID Mongo valide')
      .custom(async (value) => {
        const packageK = await PackageK.findById(value);
        if (!packageK) {
          throw new Error('Package non trouvé');
        }
        if (packageK.statut !== 'OUVERT') {
          throw new Error('Le package n\'est pas ouvert à la réservation');
        }
      }),
    body('nombrePlaces')
      .notEmpty().withMessage('nombrePlaces est requis')
      .isInt({ min: 1 }).withMessage('nombrePlaces doit être un entier >= 1'),
    body('formule')
      .optional()
      .trim(),
    body('niveauConfort')
      .optional()
      .trim(),
    body('dateDepart')
      .optional()
      .isISO8601().withMessage('dateDepart doit être une date valide (ISO 8601)'),
    body('dateRetour')
      .optional()
      .isISO8601().withMessage('dateRetour doit être une date valide (ISO 8601)')
      .custom((value, { req }) => {
        if (!req.body.dateDepart || !value) return true;
        const dateDepart = new Date(req.body.dateDepart);
        const dateRetour = new Date(value);
        if (dateRetour <= dateDepart) {
          throw new Error('dateRetour doit être après dateDepart');
        }
        return true;
      }),
    body('clients')
      .notEmpty().withMessage('clients est requis')
      .isArray({ min: 1 }).withMessage('clients doit être un array non-vide')
      .custom(async (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('clients doit contenir au moins 1 client');
        }
        for (const clientId of value) {
          if (!clientId.match(/^[0-9a-fA-F]{24}$/)) {
            throw new Error('Chaque client doit être un ID Mongo valide');
          }
        }
        const foundClients = await Client.find({ _id: { $in: value } });
        if (foundClients.length !== value.length) {
          throw new Error('Au moins un client est introuvable');
        }
      }),
    body('montantTotalDu')
      .notEmpty().withMessage('montantTotalDu est requis')
      .isFloat({ min: 0 }).withMessage('montantTotalDu doit être un nombre positif'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Ajouter le champ service requis par le schéma Prisma
      const reservationData = {
        ...req.body,
        service: 'OUMRA' // Valeur par défaut, peut être déterminée selon le package
      };

      const reservation = await reservationService.creerReservation(reservationData, req.user.id);
      return res.status(201).json({ message: 'Réservation créée', reservation });
    } catch (err) {
      console.error('Erreur création réservation:', err);
      return res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la création de la réservation' });
    }
  }
);

/**
 * GET /api/reservations
 * Liste toutes les réservations
 */
router.get('/', cacheReservations, async (req, res) => {
  try {
    const reservations = await reservationService.listerReservations();
    return res.status(200).json({ count: reservations.length, reservations });
  } catch (err) {
    console.error('Erreur récupération réservations:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des réservations' });
  }
});

/**
 * GET /api/reservations/:id
 * Détail complet
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await reservationService.obtenirReservation(req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Erreur récupération réservation:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la récupération de la réservation' });
  }
});

/**
 * POST /api/reservations/:id/clients
 * Ajouter des clients à une réservation
 */
router.post(
  '/:id/clients',
  [
    body('clientIds')
      .notEmpty().withMessage('clientIds est requis')
      .isArray({ min: 1 }).withMessage('clientIds doit être un array non-vide')
      .custom(async (value) => {
        for (const clientId of value) {
          if (!clientId.match(/^[0-9a-fA-F]{24}$/)) {
            throw new Error('Chaque clientId doit être un ID Mongo valide');
          }
        }
        const foundClients = await Client.find({ _id: { $in: value } });
        if (foundClients.length !== value.length) {
          throw new Error('Au moins un client est introuvable');
        }
      }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const reservation = await reservationService.ajouterClients(req.params.id, req.body.clientIds);
      return res.status(200).json({ message: 'Clients ajoutés', reservation });
    } catch (err) {
      console.error('Erreur ajout clients:', err);
      return res.status(err.status || 500).json({ message: err.message || 'Erreur lors de l\'ajout des clients' });
    }
  }
);

/**
 * DELETE /api/reservations/:id/clients/:clientId
 * Retirer un client
 */
router.delete('/:id/clients/:clientId', async (req, res) => {
  try {
    const reservation = await reservationService.retirerClient(req.params.id, req.params.clientId);
    return res.status(200).json({ message: 'Client retiré', reservation });
  } catch (err) {
    console.error('Erreur retrait client:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur lors du retrait du client' });
  }
});

/**
 * POST /api/reservations/:id/supplements
 * Ajouter un supplément pour un client dans la réservation
 */
router.post(
  '/:id/supplements',
  [
    body('clientId')
      .trim()
      .notEmpty().withMessage('clientId est requis')
      .isMongoId().withMessage('clientId doit être un ID Mongo valide'),
    body('supplementId')
      .trim()
      .notEmpty().withMessage('supplementId est requis')
      .isMongoId().withMessage('supplementId doit être un ID Mongo valide')
      .custom(async (value) => {
        const supplement = await Supplement.findById(value);
        if (!supplement) {
          throw new Error('Supplément non trouvé');
        }
      }),
    body('quantite')
      .notEmpty().withMessage('quantite est requis')
      .isInt({ min: 1 }).withMessage('quantite doit être un entier >= 1'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await reservationService.ajouterSupplement(req.params.id, req.body, req.user.id);
      return res.status(201).json({ message: 'Ligne de supplément créée', ...result });
    } catch (err) {
      console.error('Erreur ajout ligne supplément:', err);
      return res.status(err.status || 500).json({ message: err.message || 'Erreur lors de l\'ajout du supplément' });
    }
  }
);

/**
 * GET /api/reservations/:id/supplements
 * Lister les lignes de suppléments pour une réservation (optionnel clientId)
 */
router.get('/:id/supplements', async (req, res) => {
  try {
    const lignes = await reservationService.listerSupplements(req.params.id, req.query.clientId);
    return res.status(200).json({ count: lignes.length, lignes });
  } catch (err) {
    console.error('Erreur récupération lignes supplément:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des suppléments' });
  }
});

/**
 * DELETE /api/reservations/:id/supplements/:ligneId
 * Supprimer une ligne de supplément et mettre à jour le montant
 */
router.delete('/:id/supplements/:ligneId', async (req, res) => {
  try {
    const reservation = await reservationService.supprimerSupplement(req.params.id, req.params.ligneId);
    return res.status(200).json({ message: 'Ligne supprimée', reservation });
  } catch (err) {
    console.error('Erreur suppression ligne supplément:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la suppression du supplément' });
  }
});

/**
 * PATCH /api/reservations/:id/statut
 * Changer le statut d'une réservation (rétrocompatibilité)
 */
router.patch('/:id/statut', async (req, res) => {
  try {
    const reservation = await reservationService.changerStatut(req.params.id, req.body.statut);
    return res.status(200).json({ message: 'Statut mis à jour', statut: reservation.statut });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

/**
 * PATCH /api/reservations/:id/statut-client
 * Changer uniquement le statut client (INSCRIT → CONFIRME → PARTI → RENTRE)
 */
router.patch('/:id/statut-client', async (req, res) => {
  try {
    const reservation = await reservationService.changerStatutClient(req.params.id, req.body.statutClient);
    return res.status(200).json({ message: 'Statut client mis à jour', statutClient: reservation.statutClient });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

/**
 * DELETE /api/reservations/:id
 * Supprimer une réservation et ses données liées
 */
router.delete('/:id', async (req, res) => {
  try {
    await reservationService.supprimerReservation(req.params.id);
    return res.status(200).json({ message: 'Inscription supprimée' });
  } catch (err) {
    console.error('Erreur suppression réservation:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

module.exports = router;

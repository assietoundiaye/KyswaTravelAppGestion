const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Reservation = require('../models/Reservation');
const PackageK = require('../models/PackageK');
const Client = require('../models/Client');
const LigneSupplement = require('../models/LigneSupplement');
const Supplement = require('../models/Supplement');
const { protect, requireRole } = require('../middleware/auth');

// Protection: COMMERCIAL, GESTIONNAIRE et COMPTABLE
router.use(protect);
router.use(requireRole('COMMERCIAL', 'GESTIONNAIRE', 'COMPTABLE'));

/**
 * POST /api/reservations
 * Créer une réservation
 */
router.post(
  '/',
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
      .notEmpty().withMessage('dateDepart est requis')
      .isISO8601().withMessage('dateDepart doit être une date valide (ISO 8601)'),
    body('dateRetour')
      .notEmpty().withMessage('dateRetour est requis')
      .isISO8601().withMessage('dateRetour doit être une date valide (ISO 8601)')
      .custom((value, { req }) => {
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
        // Vérifier qu'il y a au moins 1 élément
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('clients doit contenir au moins 1 client');
        }
        // Vérifier que tous les éléments sont des IDs Mongo valides
        for (const clientId of value) {
          if (!clientId.match(/^[0-9a-fA-F]{24}$/)) {
            throw new Error('Chaque client doit être un ID Mongo valide');
          }
        }
        // Vérifier que tous les clients existent
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
      // Vérifier erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { packageKId, nombrePlaces, formule, niveauConfort, dateDepart, dateRetour, clients, montantTotalDu } = req.body;

      // Vérifier le package
      const packageK = await PackageK.findById(packageKId);

      // Vérifier quota
      if (packageK.placesReservees + nombrePlaces > packageK.quotaMax) {
        return res.status(400).json({ message: 'Quota insuffisant pour cette réservation' });
      }

      // Créer la réservation
      const reservation = new Reservation({
        idReservation: Date.now(),
        nombrePlaces,
        formule,
        niveauConfort,
        dateDepart,
        dateRetour,
        montantTotalDu,
        statut: 'EN_ATTENTE',
        statutCreation: new Date(),
        creeParUtilisateurId: req.user.id,
        packageKId: packageK._id,
        clients: clients,
      });

      await reservation.save();

      // Incrémenter placesReservees du package
      packageK.placesReservees = (packageK.placesReservees || 0) + nombrePlaces;
      await packageK.save();

      const reservationPop = await Reservation.findById(reservation._id).populate('clients').populate('packageKId');

      return res.status(201).json({ message: 'Réservation créée', reservation: reservationPop });
    } catch (err) {
      console.error('Erreur création réservation:', err);
      return res.status(500).json({ message: 'Erreur lors de la création de la réservation' });
    }
  }
);


/**
 * GET /api/reservations
 * Liste toutes les réservations
 */
router.get('/', async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('clients', 'nom prenom numeroPasseport')
      .populate('packageKId', 'nomReference type statut dateDepart dateRetour');

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
    const reservation = await Reservation.findById(req.params.id)
      .populate('clients')
      .populate('packageKId')
      .populate('paiements');

    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    return res.status(200).json({ reservation });
  } catch (err) {
    console.error('Erreur récupération réservation:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération de la réservation' });
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
        // Vérifier que tous les éléments sont des IDs Mongo valides
        for (const clientId of value) {
          if (!clientId.match(/^[0-9a-fA-F]{24}$/)) {
            throw new Error('Chaque clientId doit être un ID Mongo valide');
          }
        }
        // Vérifier que tous les clients existent
        const foundClients = await Client.find({ _id: { $in: value } });
        if (foundClients.length !== value.length) {
          throw new Error('Au moins un client est introuvable');
        }
      }),
  ],
  async (req, res) => {
    try {
      // Vérifier erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { clientIds } = req.body;

      const reservation = await Reservation.findById(req.params.id);
      if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

      const packageK = await PackageK.findById(reservation.packageKId);
      if (!packageK) return res.status(404).json({ message: 'Package lié non trouvé' });

      // Filtrer ceux déjà présents
      const newClientIds = clientIds.filter((id) => !reservation.clients.map((c) => c.toString()).includes(id));
      if (newClientIds.length === 0) {
        return res.status(400).json({ message: 'Tous les clients sont déjà présents' });
      }

      // Vérifier quota
      if (packageK.placesReservees + newClientIds.length > packageK.quotaMax) {
        return res.status(400).json({ message: 'Quota insuffisant pour ajouter ces clients' });
      }

      // Ajouter
      reservation.clients = reservation.clients.concat(newClientIds);
      reservation.nombrePlaces = (reservation.nombrePlaces || 0) + newClientIds.length;
      await reservation.save();

      packageK.placesReservees = (packageK.placesReservees || 0) + newClientIds.length;
      await packageK.save();

      const reservationPop = await Reservation.findById(reservation._id).populate('clients').populate('packageKId');
      return res.status(200).json({ message: 'Clients ajoutés', reservation: reservationPop });
    } catch (err) {
      console.error('Erreur ajout clients:', err);
      return res.status(500).json({ message: 'Erreur lors de l\'ajout des clients' });
    }
  }
);

/**
 * DELETE /api/reservations/:id/clients/:clientId
 * Retirer un client
 */
router.delete('/:id/clients/:clientId', async (req, res) => {
  try {
    const { id, clientId } = { id: req.params.id, clientId: req.params.clientId };
    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

    const packageK = await PackageK.findById(reservation.packageKId);
    if (!packageK) return res.status(404).json({ message: 'Package lié non trouvé' });

    const clientIndex = reservation.clients.map((c) => c.toString()).indexOf(clientId);
    if (clientIndex === -1) {
      return res.status(404).json({ message: 'Client non trouvé dans la réservation' });
    }

    // Retirer
    reservation.clients = reservation.clients.filter((c) => c.toString() !== clientId);
    reservation.nombrePlaces = Math.max(0, (reservation.nombrePlaces || 1) - 1);

    if (reservation.clients.length < 1) {
      return res.status(400).json({ message: 'Réservation doit avoir au moins un client' });
    }

    await reservation.save();

    packageK.placesReservees = Math.max(0, (packageK.placesReservees || 0) - 1);
    await packageK.save();

    const reservationPop = await Reservation.findById(reservation._id).populate('clients').populate('packageKId');
    return res.status(200).json({ message: 'Client retiré', reservation: reservationPop });
  } catch (err) {
    console.error('Erreur retrait client:', err);
    return res.status(500).json({ message: 'Erreur lors du retrait du client' });
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
      // Vérifier erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const reservationId = req.params.id;
      const { clientId, supplementId, quantite } = req.body;

      const reservation = await Reservation.findById(reservationId);
      if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

      // Vérifier que le client appartient à la réservation
      if (!reservation.clients.map((c) => c.toString()).includes(clientId)) {
        return res.status(400).json({ message: 'Le client n\'appartient pas à cette réservation' });
      }

      // Vérifier supplément
      const supplement = await Supplement.findById(supplementId);

      // Calcul prixUnitaire (convert Decimal128 string to Number if needed)
      const prixUnitaire = supplement.prix ? parseFloat(supplement.prix.toString()) : 0;

      // Créer la ligne
      const ligne = new LigneSupplement({
        idLigneSupplement: Date.now(),
        reservationId: reservation._id,
        clientId,
        supplementId,
        quantite,
        prixUnitaire,
        creeParUtilisateurId: req.user.id,
      });

      await ligne.save();

      // Mettre à jour montantTotalDu
      reservation.montantTotalDu = (reservation.montantTotalDu || 0) + prixUnitaire * quantite;
      await reservation.save();

      const lignePop = await LigneSupplement.findById(ligne._id).populate('supplementId');
      const reservationPop = await Reservation.findById(reservation._id).populate('clients').populate('packageKId');

      return res.status(201).json({ message: 'Ligne de supplément créée', ligne: lignePop, reservation: reservationPop });
    } catch (err) {
      console.error('Erreur ajout ligne supplément:', err);
      return res.status(500).json({ message: 'Erreur lors de l\'ajout du supplément' });
    }
  }
);

/**
 * GET /api/reservations/:id/supplements
 * Lister les lignes de suppléments pour une réservation (optionnel clientId)
 */
router.get('/:id/supplements', async (req, res) => {
  try {
    const reservationId = req.params.id;
    const { clientId } = req.query;

    const filter = { reservationId };
    if (clientId) filter.clientId = clientId;

    const lignes = await LigneSupplement.find(filter).populate('supplementId').populate('clientId', 'nom prenom');

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
    const reservationId = req.params.id;
    const ligneId = req.params.ligneId;

    const ligne = await LigneSupplement.findById(ligneId);
    if (!ligne) return res.status(404).json({ message: 'Ligne de supplément non trouvée' });
    if (ligne.reservationId.toString() !== reservationId) return res.status(400).json({ message: 'La ligne n\'appartient pas à cette réservation' });

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

    // Décrémenter montant
    const montantRetrait = (ligne.prixUnitaire || 0) * (ligne.quantite || 0);
    reservation.montantTotalDu = Math.max(0, (reservation.montantTotalDu || 0) - montantRetrait);
    await reservation.save();

    await LigneSupplement.findByIdAndDelete(ligneId);

    const reservationPop = await Reservation.findById(reservation._id).populate('clients').populate('packageKId');
    return res.status(200).json({ message: 'Ligne supprimée', reservation: reservationPop });
  } catch (err) {
    console.error('Erreur suppression ligne supplément:', err);
    return res.status(500).json({ message: 'Erreur lors de la suppression du supplément' });
  }
});

module.exports = router;



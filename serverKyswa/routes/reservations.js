const express = require('express');
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
router.post('/', async (req, res) => {
  try {
    const { packageKId, nombrePlaces, formule, niveauConfort, dateDepart, dateRetour, clients, montantTotalDu } = req.body;

    // Validations de base
    if (!packageKId || !nombrePlaces || !dateDepart || !dateRetour || !clients || !Array.isArray(clients) || clients.length === 0 || !montantTotalDu) {
      return res.status(400).json({ message: 'Champs requis manquants (packageKId, nombrePlaces, dateDepart, dateRetour, clients, montantTotalDu)' });
    }

    if (nombrePlaces < 1) {
      return res.status(400).json({ message: 'Le nombre de places doit être au moins 1' });
    }

    // Vérifier package
    const packageK = await PackageK.findById(packageKId);
    if (!packageK) {
      return res.status(404).json({ message: 'Package non trouvé' });
    }

    if (packageK.statut !== 'OUVERT') {
      return res.status(400).json({ message: 'Le package n\'est pas ouvert à la réservation' });
    }

    // Vérifier quota
    if (packageK.placesReservees + nombrePlaces > packageK.quotaMax) {
      return res.status(400).json({ message: 'Quota insuffisant pour cette réservation' });
    }

    // Vérifier que tous les clients existent
    const foundClients = await Client.find({ _id: { $in: clients } });
    if (foundClients.length !== clients.length) {
      return res.status(400).json({ message: 'Au moins un client est introuvable' });
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
});

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
router.post('/:id/clients', async (req, res) => {
  try {
    const { clientIds } = req.body;
    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ message: 'Veuillez fournir un array de clientIds' });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

    const packageK = await PackageK.findById(reservation.packageKId);
    if (!packageK) return res.status(404).json({ message: 'Package lié non trouvé' });

    // Vérifier clients existent
    const foundClients = await Client.find({ _id: { $in: clientIds } });
    if (foundClients.length !== clientIds.length) {
      return res.status(400).json({ message: 'Au moins un client est introuvable' });
    }

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
});

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
router.post('/:id/supplements', async (req, res) => {
  try {
    const reservationId = req.params.id;
    const { clientId, supplementId, quantite } = req.body;

    if (!clientId || !supplementId || !quantite) {
      return res.status(400).json({ message: 'Champs requis manquants (clientId, supplementId, quantite)' });
    }

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

    // Vérifier que le client appartient à la réservation
    if (!reservation.clients.map((c) => c.toString()).includes(clientId)) {
      return res.status(400).json({ message: 'Le client n\'appartient pas à cette réservation' });
    }

    // Vérifier supplément
    const supplement = await Supplement.findById(supplementId);
    if (!supplement) return res.status(404).json({ message: 'Supplément non trouvé' });

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
});

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



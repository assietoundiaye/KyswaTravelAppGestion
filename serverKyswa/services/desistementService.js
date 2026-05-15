/**
 * Service Désistement
 * Contient toute la logique métier liée aux désistements et remboursements.
 */

const Desistement = require('../models/Desistement');
const Reservation = require('../models/Reservation');

/**
 * Lister les désistements avec filtres optionnels
 */
async function listerDesistements({ reservationId, statut } = {}) {
  const filter = {};
  if (reservationId) filter.reservationId = reservationId;
  if (statut) filter.statut = statut;

  return Desistement.find(filter)
    .populate('clientId', 'nom prenom numeroPasseport telephone')
    .populate('reservationId', 'numero idReservation statut statutClient montantTotalDu nombrePlaces')
    .sort({ createdAt: -1 });
}

/**
 * Créer un désistement avec calcul automatique du remboursement
 */
async function creerDesistement({ reservationId, clientId, motif, dateDepart }, userId) {
  const reservation = await Reservation.findById(reservationId).populate('paiements');
  if (!reservation) {
    const err = new Error('Réservation non trouvée');
    err.status = 404;
    throw err;
  }
  if (['DESISTE', 'ANNULEE'].includes(reservation.statut)) {
    const err = new Error('Cette réservation est déjà annulée ou désistée');
    err.status = 400;
    throw err;
  }

  const clientIds = reservation.clients.map((c) => c.toString());
  if (!clientIds.includes(clientId.toString())) {
    const err = new Error("Ce client n'appartient pas à cette réservation");
    err.status = 400;
    throw err;
  }

  const dateDepartEffective = dateDepart ? new Date(dateDepart) : reservation.dateDepart;

  const totalPaye = (reservation.paiements || []).reduce(
    (s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0),
    0
  );
  const nbClients = reservation.clients.length || 1;
  const montantPayeClient = Math.round(totalPaye / nbClients);

  const desistement = await Desistement.create({
    reservationId,
    clientId,
    dateAnnulation: new Date(),
    dateDepart: dateDepartEffective,
    montantPaye: montantPayeClient,
    motif,
    creeParUtilisateurId: userId,
  });

  // Mettre à jour le statut de la réservation si tous les clients se désistent
  const autresDesistements = await Desistement.countDocuments({
    reservationId,
    statut: { $ne: 'ANNULE' },
  });

  if (autresDesistements >= nbClients || nbClients === 1) {
    reservation.statut = 'DESISTE';
    reservation.statutClient = 'DESISTE';
    await reservation.save();
  }

  return {
    desistement,
    tauxRemboursement: desistement.tauxRemboursement,
    montantRembourse: desistement.montantRembourse,
    montantPayeClient,
    nbClients,
  };
}

/**
 * Marquer un désistement comme remboursé
 */
async function rembourserDesistement(desistementId) {
  const desistement = await Desistement.findById(desistementId);
  if (!desistement) {
    const err = new Error('Désistement non trouvé');
    err.status = 404;
    throw err;
  }
  if (desistement.statut === 'REMBOURSE') {
    const err = new Error('Ce désistement est déjà remboursé');
    err.status = 400;
    throw err;
  }

  desistement.statut = 'REMBOURSE';
  desistement.dateRemboursement = new Date();
  await desistement.save();
  return desistement;
}

/**
 * Modifier la date de départ d'un désistement (recalcul automatique du taux)
 */
async function modifierDesistement(desistementId, { dateDepart, motif }) {
  const desistement = await Desistement.findById(desistementId);
  if (!desistement) {
    const err = new Error('Désistement non trouvé');
    err.status = 404;
    throw err;
  }
  if (desistement.statut === 'REMBOURSE') {
    const err = new Error('Impossible de modifier un désistement déjà remboursé');
    err.status = 400;
    throw err;
  }

  if (dateDepart) desistement.dateDepart = new Date(dateDepart);
  if (motif !== undefined) desistement.motif = motif;

  // Le hook pre('save') du modèle recalcule automatiquement joursAvantDepart, taux et montantRembourse
  await desistement.save();
  return desistement;
}

/**
 * Supprimer un désistement et remettre la réservation en INSCRIT
 */
async function supprimerDesistement(desistementId) {
  const desistement = await Desistement.findById(desistementId);
  if (!desistement) {
    const err = new Error('Désistement non trouvé');
    err.status = 404;
    throw err;
  }

  if (desistement.reservationId) {
    const reservation = await Reservation.findById(desistement.reservationId);
    if (reservation && ['DESISTE', 'ANNULEE'].includes(reservation.statut)) {
      reservation.statut = 'INSCRIT';
      reservation.statutClient = 'INSCRIT';
      await reservation.save();
    }
  }

  await Desistement.findByIdAndDelete(desistementId);
}

module.exports = {
  listerDesistements,
  creerDesistement,
  rembourserDesistement,
  modifierDesistement,
  supprimerDesistement,
};

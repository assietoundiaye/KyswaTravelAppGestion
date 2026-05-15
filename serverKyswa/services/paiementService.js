/**
 * Service Paiement
 * Contient toute la logique métier liée aux paiements (réservations et billets).
 */

const Paiement = require('../models/Paiement');
const Reservation = require('../models/Reservation');
const Billet = require('../models/Billet');

/**
 * Ajouter un paiement sur une réservation
 */
async function payerReservation(reservationId, { montant, dateReglement, mode, reference }, userId) {
  const reservation = await Reservation.findById(reservationId).populate('paiements');
  if (!reservation) {
    const err = new Error('Réservation non trouvée');
    err.status = 404;
    throw err;
  }
  if (reservation.statut === 'ANNULEE') {
    const err = new Error('Réservation annulée');
    err.status = 400;
    throw err;
  }

  const dejaRecu = reservation.paiements.reduce(
    (s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0),
    0
  );
  const resteAPayer = (reservation.montantTotalDu || 0) - dejaRecu;

  if (Number(montant) > resteAPayer) {
    const err = new Error(
      `Le montant (${Number(montant).toLocaleString('fr-FR')} FCFA) dépasse le reste à payer (${resteAPayer.toLocaleString('fr-FR')} FCFA).`
    );
    err.status = 400;
    throw err;
  }

  const paiement = new Paiement({
    idPaiement: Date.now(),
    montant,
    dateReglement,
    mode,
    reference: reference || undefined,
    reservationId: reservation._id,
    creeParUtilisateurId: userId,
  });

  await paiement.save();
  reservation.paiements.push(paiement._id);
  await reservation.save();

  await reservation.populate('paiements');
  await reservation.mettreAJourStatutPaiement();

  return paiement;
}

/**
 * Ajouter un paiement sur un billet
 */
async function payerBillet(billetId, { montant, dateReglement, mode, reference }, userId) {
  const billet = await Billet.findById(billetId).populate('paiements');
  if (!billet) {
    const err = new Error('Billet non trouvé');
    err.status = 404;
    throw err;
  }
  if (billet.statut === 'ANNULE') {
    const err = new Error('Billet annulé');
    err.status = 400;
    throw err;
  }

  const dejaRecu = billet.paiements.reduce(
    (s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0),
    0
  );
  const resteAPayer = (billet.prix || 0) - dejaRecu;

  if (Number(montant) > resteAPayer) {
    const err = new Error(
      `Le montant (${Number(montant).toLocaleString('fr-FR')} FCFA) dépasse le reste à payer (${resteAPayer.toLocaleString('fr-FR')} FCFA).`
    );
    err.status = 400;
    throw err;
  }

  const paiement = new Paiement({
    idPaiement: Date.now(),
    montant,
    dateReglement,
    mode,
    reference: reference || undefined,
    billetId: billet._id,
    creeParUtilisateurId: userId,
  });

  await paiement.save();
  billet.paiements.push(paiement._id);
  await billet.save();

  await billet.populate('paiements');
  if (billet.resteAPayer <= 0) {
    billet.statut = 'PAYE';
    await billet.save();
  }

  return paiement;
}

/**
 * Lister tous les paiements
 */
async function listerPaiements() {
  return Paiement.find()
    .populate('reservationId', 'idReservation')
    .populate('billetId', 'numeroBillet')
    .sort({ dateReglement: -1 });
}

/**
 * Modifier un paiement
 */
async function modifierPaiement(paiementId, { montant, dateReglement, mode, reference }) {
  const paiement = await Paiement.findById(paiementId);
  if (!paiement) {
    const err = new Error('Paiement non trouvé');
    err.status = 404;
    throw err;
  }

  if (montant !== undefined) paiement.montant = montant;
  if (dateReglement !== undefined) paiement.dateReglement = dateReglement;
  if (mode !== undefined) paiement.mode = mode;
  if (reference !== undefined) paiement.reference = reference || undefined;

  await paiement.save();

  // Recalculer le statut de la réservation liée
  if (paiement.reservationId) {
    const resa = await Reservation.findById(paiement.reservationId).populate('paiements');
    if (resa) await resa.mettreAJourStatutPaiement();
  }

  return paiement;
}

/**
 * Supprimer un paiement
 */
async function supprimerPaiement(paiementId) {
  const paiement = await Paiement.findById(paiementId);
  if (!paiement) {
    const err = new Error('Paiement non trouvé');
    err.status = 404;
    throw err;
  }

  if (paiement.reservationId) {
    await Reservation.findByIdAndUpdate(paiement.reservationId, {
      $pull: { paiements: paiement._id },
    });
    const resa = await Reservation.findById(paiement.reservationId).populate('paiements');
    if (resa && resa.statut === 'PAYEE') {
      resa.statut = 'CONFIRMEE';
      await resa.save();
    }
  }

  if (paiement.billetId) {
    await Billet.findByIdAndUpdate(paiement.billetId, {
      $pull: { paiements: paiement._id },
    });
  }

  await Paiement.findByIdAndDelete(paiementId);
}

module.exports = {
  payerReservation,
  payerBillet,
  listerPaiements,
  modifierPaiement,
  supprimerPaiement,
};

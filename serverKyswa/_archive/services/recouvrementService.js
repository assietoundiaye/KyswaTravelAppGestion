/**
 * Service Recouvrement
 * Contient toute la logique métier liée au recouvrement des impayés et aux relances.
 */

const Reservation = require('../models/Reservation');
const Relance = require('../models/Relance');
const Desistement = require('../models/Desistement');

/**
 * Récupérer les impayés avec priorité sur les départs proches
 * @param {string} userRole - Rôle de l'utilisateur connecté (pour les remboursements)
 */
async function getImpayés(userRole) {
  const reservations = await Reservation.find({
    statutClient: { $nin: ['DESISTE', 'ANNULE'] },
    statut: { $nin: ['ANNULEE', 'DESISTE', 'ANNULE'] },
  })
    .populate('clients', 'nom prenom telephone email')
    .populate('packageKId', 'nomReference type dateDepart dateRetour')
    .populate('paiements', 'montant dateReglement mode');

  const now = new Date();

  const tousImpayés = reservations
    .map((r) => {
      const totalPaye = (r.paiements || []).reduce(
        (s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0),
        0
      );
      const reste = (r.montantTotalDu || 0) - totalPaye;
      const dateDepart = r.packageKId?.dateDepart || r.dateDepart;
      const joursAvantDepart = dateDepart
        ? Math.floor((new Date(dateDepart) - now) / (1000 * 60 * 60 * 24))
        : null;
      return {
        ...r.toObject(),
        resteAPayer: reste,
        totalPaye,
        joursAvantDepart,
        dateDepart,
      };
    })
    .filter((r) => r.resteAPayer > 0);

  // Impayés urgents : départ dans les 30 prochains jours (y compris départ passé)
  const impayés = tousImpayés
    .filter((r) => r.joursAvantDepart !== null && r.joursAvantDepart <= 30)
    .sort((a, b) => {
      if (a.joursAvantDepart !== b.joursAvantDepart) return a.joursAvantDepart - b.joursAvantDepart;
      return b.resteAPayer - a.resteAPayer;
    });

  // Impayés hors fenêtre : départ > 30j ou sans date
  const impayésAutres = tousImpayés
    .filter((r) => r.joursAvantDepart === null || r.joursAvantDepart > 30)
    .sort((a, b) => {
      const jA = a.joursAvantDepart ?? 9999;
      const jB = b.joursAvantDepart ?? 9999;
      if (jA !== jB) return jA - jB;
      return b.resteAPayer - a.resteAPayer;
    });

  // Remboursements en attente (comptable/admin/dg uniquement)
  let remboursements = [];
  if (['comptable', 'administrateur', 'dg'].includes(userRole)) {
    remboursements = await Desistement.find({ statut: 'EN_ATTENTE' })
      .populate('clientId', 'nom prenom telephone')
      .populate('reservationId', 'numero idReservation');
  }

  const totalImpaye = tousImpayés.reduce((s, r) => s + r.resteAPayer, 0);
  const urgents = impayés.filter((r) => r.joursAvantDepart !== null && r.joursAvantDepart <= 7).length;
  const prochains = impayés.filter(
    (r) => r.joursAvantDepart !== null && r.joursAvantDepart > 7 && r.joursAvantDepart <= 30
  ).length;

  return {
    count: impayés.length,
    impayés,
    impayésAutres,
    remboursements,
    stats: { totalImpaye, urgents, prochains, total: tousImpayés.length },
  };
}

/**
 * Enregistrer une relance téléphonique
 */
async function enregistrerRelance({ reservationId, clientId, notes, resultat, dateProchaineRelance }, agentId) {
  return Relance.create({
    reservationId,
    clientId,
    notes,
    resultat,
    dateProchaineRelance: dateProchaineRelance || undefined,
    agentId,
  });
}

/**
 * Lister les relances d'une réservation
 */
async function getRelances(reservationId) {
  return Relance.find({ reservationId })
    .populate('agentId', 'nom prenom')
    .sort({ dateRelance: -1 });
}

module.exports = {
  getImpayés,
  enregistrerRelance,
  getRelances,
};

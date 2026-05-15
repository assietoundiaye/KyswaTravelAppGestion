/**
 * Service Réunion
 * Contient toute la logique métier liée aux réunions.
 */

const Reunion = require('../models/Reunion');

/**
 * Lister les réunions avec filtres optionnels
 */
async function listerReunions({ packageKId, statut } = {}) {
  const filter = {};
  if (packageKId) filter.packageKId = packageKId;
  if (statut) filter.statut = statut;

  return Reunion.find(filter)
    .populate('packageKId', 'nomReference type dateDepart')
    .populate('participants', 'nom prenom telephone')
    .sort({ dateReunion: 1 });
}

/**
 * Créer une réunion
 */
async function creerReunion({ packageKId, titre, dateReunion, lieu, ordreJour, participants }, userId) {
  return Reunion.create({
    packageKId,
    titre,
    dateReunion,
    lieu,
    ordreJour,
    participants: participants || [],
    creeParUtilisateurId: userId,
  });
}

/**
 * Modifier une réunion
 */
async function modifierReunion(reunionId, data) {
  const reunion = await Reunion.findById(reunionId);
  if (!reunion) {
    const err = new Error('Réunion non trouvée');
    err.status = 404;
    throw err;
  }

  const { titre, dateReunion, lieu, ordreJour, participants, statut, compteRendu } = data;
  if (titre) reunion.titre = titre;
  if (dateReunion) reunion.dateReunion = dateReunion;
  if (lieu !== undefined) reunion.lieu = lieu;
  if (ordreJour !== undefined) reunion.ordreJour = ordreJour;
  if (participants) reunion.participants = participants;
  if (statut) reunion.statut = statut;
  if (compteRendu !== undefined) reunion.compteRendu = compteRendu;

  await reunion.save();
  return reunion;
}

/**
 * Supprimer une réunion
 */
async function supprimerReunion(reunionId) {
  const reunion = await Reunion.findByIdAndDelete(reunionId);
  if (!reunion) {
    const err = new Error('Réunion non trouvée');
    err.status = 404;
    throw err;
  }
}

module.exports = {
  listerReunions,
  creerReunion,
  modifierReunion,
  supprimerReunion,
};

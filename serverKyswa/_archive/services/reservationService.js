/**
 * Service Réservation
 * Contient toute la logique métier liée aux réservations (inscriptions).
 * CONVERTI VERS PRISMA - 18 août 2026
 */

const { getPrisma } = require('../config/database');
const prisma = getPrisma();
const emailService = require('./emailService');

/**
 * Créer une nouvelle réservation
 * @param {Object} data - Données de la réservation
 * @param {string} userId - ID de l'utilisateur créateur
 * @returns {Promise<Object>} - Réservation créée
 */
async function creerReservation(data, userId) {
  const { packageKId, nombrePlaces, formule, niveauConfort, typeChambre, dateDepart, dateRetour, clients, montantTotalDu, statutClient, notes, service } = data;

  // Vérifier le package
  const packageK = await PackageK.findById(packageKId);
  if (!packageK) {
    const err = new Error('Package non trouvé');
    err.status = 404;
    throw err;
  }

  if (packageK.statut !== 'OUVERT') {
    const err = new Error('Le package n\'est pas ouvert à la réservation');
    err.status = 400;
    throw err;
  }

  // Déterminer le service à partir du type du package si pas fourni
  let serviceType = service;
  if (!serviceType && packageK.type) {
    // Mapping des types de package vers les services
    const typeToServiceMap = {
      'OUMRA': 'OUMRA',
      'HAJJ': 'HAJJ',
      'ZIAR_FES': 'ZIARRA',
      'ZIARRA': 'ZIARRA',
      'TOURISME': 'TOURISME',
      'BILLET': 'BILLET'
    };
    serviceType = typeToServiceMap[packageK.type] || 'OUMRA'; // Valeur par défaut
  }

  // Assurer qu'on a toujours un service
  if (!serviceType) {
    serviceType = 'OUMRA';
  }

  // Vérifier quota
  if (packageK.placesReservees + nombrePlaces > packageK.quotaMax) {
    const err = new Error('Quota insuffisant pour cette réservation');
    err.status = 400;
    throw err;
  }

  // Vérifier qu'aucun client n'est déjà inscrit sur ce package (hors annulés/désistés)
  const reservationsExistantes = await Reservation.find({
    packageKId: packageK._id,
    statut: { $nin: ['ANNULEE', 'DESISTE'] },
    statutClient: { $nin: ['ANNULE', 'DESISTE'] },
  }).select('clients');

  const clientsDejaInscrits = new Set(
    reservationsExistantes.flatMap(r => r.clients.map(c => c.toString()))
  );

  const doublons = clients.filter(clientId => clientsDejaInscrits.has(clientId.toString()));
  if (doublons.length > 0) {
    const clientsEnDoublon = await Client.find({ _id: { $in: doublons } }).select('nom prenom');
    const noms = clientsEnDoublon.map(c => `${c.nom} ${c.prenom}`).join(', ');
    const err = new Error(`Ce(s) client(s) est/sont déjà inscrit(s) sur ce package : ${noms}`);
    err.status = 400;
    throw err;
  }

  // Créer la réservation
  const reservation = new Reservation({
    idReservation: Date.now(),
    nombrePlaces,
    formule: formule || undefined,
    niveauConfort: niveauConfort || undefined,
    typeChambre: typeChambre || undefined,
    dateDepart,
    dateRetour,
    montantTotalDu,
    statut: 'INSCRIT',
    statutClient: statutClient || 'INSCRIT',
    notes: notes || undefined,
    statutCreation: new Date(),
    creeParUtilisateurId: userId,
    packageKId: packageK._id,
    clients: clients,
    service: serviceType, // Ajouter le champ service mappé
  });

  await reservation.save();

  // Incrémenter placesReservees du package
  packageK.placesReservees = (packageK.placesReservees || 0) + nombrePlaces;
  await packageK.save();

  // Populer et retourner
  const reservationPop = await Reservation.findById(reservation._id)
    .populate('clients')
    .populate('packageKId');

  // Envoyer email de confirmation au premier client
  if (reservationPop.clients && reservationPop.clients.length > 0) {
    const premierClient = reservationPop.clients[0];
    if (premierClient.email) {
      emailService.envoyerConfirmationReservation(reservationPop, premierClient)
        .catch(err => console.error('Erreur envoi email confirmation:', err.message));
    }
  }

  return reservationPop;
}

/**
 * Lister toutes les réservations
 * @returns {Promise<Array>} - Liste des réservations
 */
async function listerReservations() {
  return Reservation.find()
    .populate('clients', 'nom prenom numeroPasseport')
    .populate('packageKId', 'nomReference type statut dateDepart dateRetour')
    .populate('paiements', 'montant mode dateReglement reference');
}

/**
 * Obtenir le détail d'une réservation
 * @param {string} reservationId - ID de la réservation
 * @returns {Promise<Object>} - Réservation avec documents
 */
async function obtenirReservation(reservationId) {
  const reservation = await Reservation.findById(reservationId)
    .populate('clients')
    .populate('packageKId')
    .populate('paiements');

  if (!reservation) {
    const err = new Error('Réservation non trouvée');
    err.status = 404;
    throw err;
  }

  const documents = await Document.find({ reservationId });

  return { reservation, documents };
}

/**
 * Ajouter des clients à une réservation
 * @param {string} reservationId - ID de la réservation
 * @param {Array<string>} clientIds - IDs des clients à ajouter
 * @returns {Promise<Object>} - Réservation mise à jour
 */
async function ajouterClients(reservationId, clientIds) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    const err = new Error('Réservation non trouvée');
    err.status = 404;
    throw err;
  }

  const packageK = await PackageK.findById(reservation.packageKId);
  if (!packageK) {
    const err = new Error('Package lié non trouvé');
    err.status = 404;
    throw err;
  }

  // Filtrer ceux déjà présents
  const newClientIds = clientIds.filter((id) => !reservation.clients.map((c) => c.toString()).includes(id));
  if (newClientIds.length === 0) {
    const err = new Error('Tous les clients sont déjà présents');
    err.status = 400;
    throw err;
  }

  // Vérifier quota
  if (packageK.placesReservees + newClientIds.length > packageK.quotaMax) {
    const err = new Error('Quota insuffisant pour ajouter ces clients');
    err.status = 400;
    throw err;
  }

  // Vérifier doublons dans autres réservations
  const autresReservations = await Reservation.find({
    packageKId: packageK._id,
    _id: { $ne: reservation._id },
    statut: { $nin: ['ANNULEE', 'DESISTE'] },
    statutClient: { $nin: ['ANNULE', 'DESISTE'] },
  }).select('clients');

  const clientsDejaInscrits = new Set(
    autresReservations.flatMap(r => r.clients.map(c => c.toString()))
  );

  const doublons = newClientIds.filter(id => clientsDejaInscrits.has(id.toString()));
  if (doublons.length > 0) {
    const clientsEnDoublon = await Client.find({ _id: { $in: doublons } }).select('nom prenom');
    const noms = clientsEnDoublon.map(c => `${c.nom} ${c.prenom}`).join(', ');
    const err = new Error(`Ce(s) client(s) est/sont déjà inscrit(s) sur ce package : ${noms}`);
    err.status = 400;
    throw err;
  }

  // Ajouter
  reservation.clients = reservation.clients.concat(newClientIds);
  reservation.nombrePlaces = (reservation.nombrePlaces || 0) + newClientIds.length;
  await reservation.save();

  packageK.placesReservees = (packageK.placesReservees || 0) + newClientIds.length;
  await packageK.save();

  return Reservation.findById(reservation._id).populate('clients').populate('packageKId');
}

/**
 * Retirer un client d'une réservation
 * @param {string} reservationId - ID de la réservation
 * @param {string} clientId - ID du client à retirer
 * @returns {Promise<Object>} - Réservation mise à jour
 */
async function retirerClient(reservationId, clientId) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    const err = new Error('Réservation non trouvée');
    err.status = 404;
    throw err;
  }

  const packageK = await PackageK.findById(reservation.packageKId);
  if (!packageK) {
    const err = new Error('Package lié non trouvé');
    err.status = 404;
    throw err;
  }

  const clientIndex = reservation.clients.map((c) => c.toString()).indexOf(clientId);
  if (clientIndex === -1) {
    const err = new Error('Client non trouvé dans la réservation');
    err.status = 404;
    throw err;
  }

  // Retirer
  reservation.clients = reservation.clients.filter((c) => c.toString() !== clientId);
  reservation.nombrePlaces = Math.max(0, (reservation.nombrePlaces || 1) - 1);

  if (reservation.clients.length < 1) {
    const err = new Error('Réservation doit avoir au moins un client');
    err.status = 400;
    throw err;
  }

  await reservation.save();

  packageK.placesReservees = Math.max(0, (packageK.placesReservees || 0) - 1);
  await packageK.save();

  return Reservation.findById(reservation._id).populate('clients').populate('packageKId');
}

/**
 * Ajouter un supplément à une réservation
 * @param {string} reservationId - ID de la réservation
 * @param {Object} data - Données du supplément
 * @param {string} userId - ID de l'utilisateur créateur
 * @returns {Promise<Object>} - Ligne de supplément créée et réservation mise à jour
 */
async function ajouterSupplement(reservationId, { clientId, supplementId, quantite }, userId) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    const err = new Error('Réservation non trouvée');
    err.status = 404;
    throw err;
  }

  // Vérifier que le client appartient à la réservation
  if (!reservation.clients.map((c) => c.toString()).includes(clientId)) {
    const err = new Error('Le client n\'appartient pas à cette réservation');
    err.status = 400;
    throw err;
  }

  // Vérifier supplément
  const supplement = await Supplement.findById(supplementId);
  if (!supplement) {
    const err = new Error('Supplément non trouvé');
    err.status = 404;
    throw err;
  }

  const prixUnitaire = supplement.prix ? parseFloat(supplement.prix.toString()) : 0;

  // Créer la ligne
  const ligne = new LigneSupplement({
    idLigneSupplement: Date.now(),
    reservationId: reservation._id,
    clientId,
    supplementId,
    quantite,
    prixUnitaire,
    creeParUtilisateurId: userId,
  });

  await ligne.save();

  // Mettre à jour montantTotalDu
  reservation.montantTotalDu = (reservation.montantTotalDu || 0) + prixUnitaire * quantite;
  await reservation.save();

  const lignePop = await LigneSupplement.findById(ligne._id).populate('supplementId');
  const reservationPop = await Reservation.findById(reservation._id).populate('clients').populate('packageKId');

  return { ligne: lignePop, reservation: reservationPop };
}

/**
 * Lister les suppléments d'une réservation
 * @param {string} reservationId - ID de la réservation
 * @param {string} clientId - ID du client (optionnel)
 * @returns {Promise<Array>} - Liste des lignes de suppléments
 */
async function listerSupplements(reservationId, clientId = null) {
  const filter = { reservationId };
  if (clientId) filter.clientId = clientId;

  return LigneSupplement.find(filter)
    .populate('supplementId')
    .populate('clientId', 'nom prenom');
}

/**
 * Supprimer un supplément d'une réservation
 * @param {string} reservationId - ID de la réservation
 * @param {string} ligneId - ID de la ligne de supplément
 * @returns {Promise<Object>} - Réservation mise à jour
 */
async function supprimerSupplement(reservationId, ligneId) {
  const ligne = await LigneSupplement.findById(ligneId);
  if (!ligne) {
    const err = new Error('Ligne de supplément non trouvée');
    err.status = 404;
    throw err;
  }

  if (ligne.reservationId.toString() !== reservationId) {
    const err = new Error('La ligne n\'appartient pas à cette réservation');
    err.status = 400;
    throw err;
  }

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    const err = new Error('Réservation non trouvée');
    err.status = 404;
    throw err;
  }

  // Décrémenter montant
  const montantRetrait = (ligne.prixUnitaire || 0) * (ligne.quantite || 0);
  reservation.montantTotalDu = Math.max(0, (reservation.montantTotalDu || 0) - montantRetrait);
  await reservation.save();

  await LigneSupplement.findByIdAndDelete(ligneId);

  return Reservation.findById(reservation._id).populate('clients').populate('packageKId');
}

/**
 * Changer le statut d'une réservation
 * @param {string} reservationId - ID de la réservation
 * @param {string} statut - Nouveau statut
 * @returns {Promise<Object>} - Réservation mise à jour
 */
async function changerStatut(reservationId, statut) {
  const statutsValides = ['EN_ATTENTE', 'INSCRIT', 'CONFIRME', 'PARTIEL', 'SOLDE', 'ANNULEE', 'PAYEE', 'DESISTE', 'PARTI', 'RENTRE'];
  if (!statutsValides.includes(statut)) {
    const err = new Error('Statut invalide');
    err.status = 400;
    throw err;
  }

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    const err = new Error('Réservation non trouvée');
    err.status = 404;
    throw err;
  }

  reservation.statut = statut;

  // Synchroniser avec statutClient
  if (['INSCRIT', 'CONFIRME', 'DESISTE', 'PARTI', 'RENTRE', 'ANNULEE'].includes(statut)) {
    reservation.statutClient = statut === 'ANNULEE' ? 'ANNULE' : statut;
  }

  await reservation.save();
  return reservation;
}

/**
 * Changer le statut client d'une réservation
 * @param {string} reservationId - ID de la réservation
 * @param {string} statutClient - Nouveau statut client
 * @returns {Promise<Object>} - Réservation mise à jour
 */
async function changerStatutClient(reservationId, statutClient) {
  const valides = ['INSCRIT', 'CONFIRME', 'DESISTE', 'PARTI', 'RENTRE', 'ANNULE'];
  if (!valides.includes(statutClient)) {
    const err = new Error('Statut client invalide');
    err.status = 400;
    throw err;
  }

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    const err = new Error('Réservation non trouvée');
    err.status = 404;
    throw err;
  }

  reservation.statutClient = statutClient;
  reservation.statut = statutClient === 'ANNULE' ? 'ANNULEE' : statutClient;
  await reservation.save();

  return reservation;
}

/**
 * Supprimer une réservation et ses données liées
 * @param {string} reservationId - ID de la réservation
 * @returns {Promise<void>}
 */
async function supprimerReservation(reservationId) {
  const reservation = await Reservation.findById(reservationId).populate('paiements');
  if (!reservation) {
    const err = new Error('Réservation non trouvée');
    err.status = 404;
    throw err;
  }

  // Supprimer les paiements liés
  if (reservation.paiements?.length > 0) {
    await Paiement.deleteMany({ reservationId: reservation._id });
  }

  // Supprimer les lignes de suppléments liées
  await LigneSupplement.deleteMany({ reservationId: reservation._id });

  // Supprimer les documents liés
  await Document.deleteMany({ reservationId: reservation._id });

  // Libérer les places dans le package
  if (reservation.packageKId && reservation.nombrePlaces) {
    await PackageK.findByIdAndUpdate(reservation.packageKId, {
      $inc: { placesReservees: -reservation.nombrePlaces },
    });
  }

  await Reservation.findByIdAndDelete(reservationId);
}

module.exports = {
  creerReservation,
  listerReservations,
  obtenirReservation,
  ajouterClients,
  retirerClient,
  ajouterSupplement,
  listerSupplements,
  supprimerSupplement,
  changerStatut,
  changerStatutClient,
  supprimerReservation,
};

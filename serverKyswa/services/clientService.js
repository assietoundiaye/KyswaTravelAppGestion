/**
 * Service Client
 * Contient toute la logique métier liée aux clients.
 */

const Client = require('../models/Client');
const Document = require('../models/Document');
const Reservation = require('../models/Reservation');
const Billet = require('../models/Billet');

const escapeRegExp = (str) => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

/**
 * Lister les clients avec filtres optionnels
 */
async function listerClients({ search, passeport } = {}) {
  const filter = {};

  if (passeport) {
    filter.numeroPasseport = typeof passeport === 'string' ? passeport : String(passeport);
  }

  if (search) {
    if (typeof search !== 'string') {
      const err = new Error('Le format de recherche est invalide.');
      err.status = 400;
      throw err;
    }
    const regex = new RegExp(escapeRegExp(search), 'i');
    filter.$or = [
      { nom: regex },
      { prenom: regex },
      { telephone: regex },
      { email: regex },
    ];
  }

  return Client.find(filter)
    .select('numeroPasseport nom prenom telephone email dateCreation')
    .sort({ dateCreation: -1 })
    .limit(100);
}

/**
 * Récupérer un client avec ses documents
 */
async function getClientAvecDocuments(clientId) {
  const client = await Client.findById(clientId);
  if (!client) {
    const err = new Error('Client non trouvé');
    err.status = 404;
    throw err;
  }
  const documents = await Document.find({ clientId });
  return { client, documents };
}

/**
 * Créer un client
 */
async function creerClient(data, userId) {
  let { nomComplet, nom, prenom, telephone, email, numeroPasseport } = data;

  if (nomComplet && !nom && !prenom) {
    const parts = nomComplet.trim().split(/\s+/);
    if (parts.length >= 2) {
      nom = parts[0];
      prenom = parts.slice(1).join(' ');
    } else {
      prenom = parts[0];
      nom = 'Client';
    }
  }

  if (nom) nom = nom.toUpperCase().trim();
  if (prenom) prenom = prenom.toUpperCase().trim();
  if (!numeroPasseport) numeroPasseport = undefined;

  if (telephone) {
    const existing = await Client.findOne({ telephone: telephone.trim() });
    if (existing) {
      const err = new Error(
        `Ce numéro de téléphone (${telephone}) est déjà utilisé par ${existing.nom} ${existing.prenom}`
      );
      err.status = 409;
      throw err;
    }
  }

  const client = new Client({
    numeroPasseport,
    nom,
    prenom,
    telephone: telephone || undefined,
    email: email || undefined,
    creeParUtilisateurId: userId,
  });

  await client.save();
  return client;
}

/**
 * Modifier un client
 */
async function modifierClient(clientId, data) {
  const client = await Client.findById(clientId);
  if (!client) {
    const err = new Error('Client non trouvé');
    err.status = 404;
    throw err;
  }

  const { nom, prenom, telephone, email, adresse, dateNaissance, lieuNaissance, numeroCNI } = data;

  if (nom) client.nom = nom.toUpperCase().trim();
  if (prenom) client.prenom = prenom.toUpperCase().trim();

  if (data.numeroPasseport !== undefined) {
    const pp = data.numeroPasseport ? data.numeroPasseport.trim() : undefined;
    if (pp) {
      const existing = await Client.findOne({ numeroPasseport: pp, _id: { $ne: client._id } });
      if (existing) {
        const err = new Error(`Ce numéro de passeport est déjà utilisé par ${existing.nom} ${existing.prenom}`);
        err.status = 409;
        throw err;
      }
    }
    client.numeroPasseport = pp || undefined;
  }

  if (telephone !== undefined) {
    const tel = telephone ? telephone.trim() : undefined;
    if (tel) {
      const existing = await Client.findOne({ telephone: tel, _id: { $ne: client._id } });
      if (existing) {
        const err = new Error(`Ce numéro de téléphone est déjà utilisé par ${existing.nom} ${existing.prenom}`);
        err.status = 409;
        throw err;
      }
    }
    client.telephone = tel || undefined;
  }

  if (email !== undefined) client.email = email || undefined;
  if (adresse !== undefined) client.adresse = adresse;
  if (dateNaissance !== undefined) client.dateNaissance = dateNaissance;
  if (lieuNaissance !== undefined) client.lieuNaissance = lieuNaissance;
  if (numeroCNI !== undefined) client.numeroCNI = numeroCNI || undefined;
  if (data.niveauFidelite) client.niveauFidelite = data.niveauFidelite;
  if (data.referentId !== undefined) client.referentId = data.referentId || undefined;
  if (data.dateExpirationPasseport !== undefined) client.dateExpirationPasseport = data.dateExpirationPasseport;

  await client.save();
  return client;
}

/**
 * Supprimer un client (uniquement s'il n'a aucune réservation ni billet actif)
 */
async function supprimerClient(clientId) {
  const client = await Client.findById(clientId);
  if (!client) {
    const err = new Error('Client non trouvé');
    err.status = 404;
    throw err;
  }

  const nbReservations = await Reservation.countDocuments({ clients: client._id });
  if (nbReservations > 0) {
    const err = new Error(
      `Impossible de supprimer : ce client est lié à ${nbReservations} réservation(s). Retirez-le d'abord des réservations.`
    );
    err.status = 400;
    throw err;
  }

  const nbBillets = await Billet.countDocuments({ clientId: client._id });
  if (nbBillets > 0) {
    const err = new Error(
      `Impossible de supprimer : ce client a ${nbBillets} billet(s) associé(s). Supprimez-les d'abord.`
    );
    err.status = 400;
    throw err;
  }

  await Document.deleteMany({ clientId: client._id });
  await Client.findByIdAndDelete(clientId);
}

module.exports = {
  listerClients,
  getClientAvecDocuments,
  creerClient,
  modifierClient,
  supprimerClient,
};

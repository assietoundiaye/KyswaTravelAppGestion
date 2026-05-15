/**
 * Service Message
 * Contient toute la logique métier liée à la messagerie interne.
 */

const Message = require('../models/Message');
const Utilisateur = require('../models/Utilisateur');
const AuditLog = require('../models/AuditLog');

/**
 * Récupérer les messages d'un utilisateur (envoyés + reçus)
 */
async function getMessages(userId) {
  return Message.find({
    $or: [{ expediteurId: userId }, { destinataireId: userId }],
  })
    .populate('expediteurId', 'nom prenom role')
    .populate('destinataireId', 'nom prenom role')
    .sort({ createdAt: -1 })
    .limit(50);
}

/**
 * Compter les messages non lus d'un utilisateur
 */
async function compterNonLus(userId) {
  return Message.countDocuments({ destinataireId: userId, lu: false });
}

/**
 * Envoyer un message
 */
async function envoyerMessage({ destinataireId, contenu }, expediteurId) {
  if (destinataireId === expediteurId.toString()) {
    const err = new Error('Vous ne pouvez pas vous envoyer un message');
    err.status = 400;
    throw err;
  }

  const destinataire = await Utilisateur.findById(destinataireId);
  if (!destinataire) {
    const err = new Error('Destinataire non trouvé');
    err.status = 404;
    throw err;
  }

  const message = await Message.create({
    expediteurId,
    destinataireId,
    contenu,
  });

  await message.populate('expediteurId', 'nom prenom role');
  await message.populate('destinataireId', 'nom prenom role');
  return message;
}

/**
 * Marquer un message comme lu
 */
async function marquerLu(messageId, userId) {
  const message = await Message.findById(messageId);
  if (!message) {
    const err = new Error('Message non trouvé');
    err.status = 404;
    throw err;
  }
  if (message.destinataireId.toString() !== userId.toString()) {
    const err = new Error('Accès interdit');
    err.status = 403;
    throw err;
  }

  message.lu = true;
  message.luAt = new Date();
  await message.save();
  return message;
}

/**
 * Récupérer les logs d'audit
 */
async function getAuditLogs({ search, module: mod, action } = {}) {
  const filter = {};
  if (mod && mod !== 'tous') filter.module = mod;
  if (action && action !== 'tous') filter.action = action;
  if (search) {
    filter.$or = [
      { userNom: { $regex: search, $options: 'i' } },
      { module: { $regex: search, $options: 'i' } },
    ];
  }

  return AuditLog.find(filter)
    .populate('userId', 'nom prenom role')
    .sort({ createdAt: -1 })
    .limit(200);
}

module.exports = {
  getMessages,
  compterNonLus,
  envoyerMessage,
  marquerLu,
  getAuditLogs,
};

/**
 * @fileoverview Routes — Module messages internes (PostgreSQL / Prisma + Socket.IO)
 */
const express = require('express');
const { protect, requireRole } = require('../../core/middleware/auth');
const prisma = require('../../database/client');

function createMessagesRoutes(dependencies) {
  const router = express.Router();

  /**
   * Helper pour formatter un message selon les attentes du frontend
   */
  const formatMessage = (msg, currentUserId, userProfilesMap = {}) => {
    const expediteur = msg.profiles_messages_expediteur_idToprofiles || 
                       msg.profiles_messages_sender_idToprofiles || 
                       userProfilesMap[msg.expediteur_id || msg.sender_id] || 
                       { id: msg.expediteur_id || msg.sender_id, nom: 'Inconnu', prenom: '', role: 'agent' };

    const destinataireProfile = userProfilesMap[msg.destinataire] || 
                                (msg.destinataire === 'tous' ? { id: 'tous', nom: 'Tous', prenom: 'Équipe', role: 'Global' } : { id: msg.destinataire, nom: 'Destinataire', prenom: '', role: 'agent' });

    // Calcul si lu
    const isSender = (msg.expediteur_id === currentUserId || msg.sender_id === currentUserId);
    const hasReadRecord = msg.message_reads && msg.message_reads.some(r => r.user_id === currentUserId);
    const isLu = isSender ? true : Boolean(hasReadRecord);

    const luRecord = msg.message_reads ? msg.message_reads.find(r => r.user_id === currentUserId) : null;

    return {
      _id: msg.id,
      id: msg.id,
      expediteurId: {
        _id: expediteur.id,
        id: expediteur.id,
        nom: expediteur.nom,
        prenom: expediteur.prenom,
        role: expediteur.role,
        avatar_url: expediteur.avatar_url,
      },
      destinataireId: {
        _id: destinataireProfile.id,
        id: destinataireProfile.id,
        nom: destinataireProfile.nom,
        prenom: destinataireProfile.prenom,
        role: destinataireProfile.role,
        avatar_url: destinataireProfile.avatar_url,
      },
      contenu: msg.contenu,
      priorite: msg.priorite || 'normal',
      lu: isLu,
      luAt: luRecord?.lu_at || null,
      createdAt: msg.created_at,
      created_at: msg.created_at,
    };
  };

  /**
   * GET /api/messages
   * Récupère tous les messages de l'utilisateur connecté (envoyés + reçus)
   */
  router.get('/', protect, async (req, res, next) => {
    try {
      const currentUserId = req.user.id;

      // 1. Récupérer les messages où l'utilisateur est expéditeur OU destinataire OU message 'tous'
      const rawMessages = await prisma.messages.findMany({
        where: {
          OR: [
            { expediteur_id: currentUserId },
            { sender_id: currentUserId },
            { destinataire: currentUserId },
            { destinataire: 'tous' },
          ]
        },
        include: {
          profiles_messages_expediteur_idToprofiles: {
            select: { id: true, nom: true, prenom: true, role: true, avatar_url: true }
          },
          profiles_messages_sender_idToprofiles: {
            select: { id: true, nom: true, prenom: true, role: true, avatar_url: true }
          },
          message_reads: {
            select: { user_id: true, lu_at: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 100,
      });

      // 2. Récupérer les profils des destinataires pour peupler destinataireId
      const recipientIds = [...new Set(rawMessages.map(m => m.destinataire).filter(id => id && id !== 'tous'))];
      const recipientProfiles = await prisma.profiles.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, nom: true, prenom: true, role: true, avatar_url: true }
      });
      const profilesMap = {};
      recipientProfiles.forEach(p => { profilesMap[p.id] = p; });

      // 3. Formater la liste
      const formatted = rawMessages.map(m => formatMessage(m, currentUserId, profilesMap));

      return res.status(200).json({
        success: true,
        count: formatted.length,
        total: formatted.length,
        messages: formatted,
        data: formatted,
      });
    } catch (e) { next(e); }
  });

  /**
   * GET /api/messages/non-lus
   * Compte le nombre de messages reçus non encore lus par l'utilisateur connecté
   */
  router.get('/non-lus', protect, async (req, res, next) => {
    try {
      const currentUserId = req.user.id;
      
      const unreadCount = await prisma.messages.count({
        where: {
          AND: [
            {
              OR: [
                { destinataire: currentUserId },
                { destinataire: 'tous' }
              ]
            },
            {
              NOT: {
                OR: [
                  { expediteur_id: currentUserId },
                  { sender_id: currentUserId }
                ]
              }
            },
            {
              message_reads: {
                none: { user_id: currentUserId }
              }
            }
          ]
        }
      });

      return res.status(200).json({ success: true, count: unreadCount });
    } catch (e) { next(e); }
  });

  /**
   * POST /api/messages
   * Envoyer un message interne
   */
  router.post('/', protect, async (req, res, next) => {
    try {
      const { destinataireId, contenu, priorite } = req.body;
      const currentUserId = req.user.id;

      if (!contenu || !contenu.trim()) {
        return res.status(400).json({ success: false, message: 'Le contenu du message est requis' });
      }
      if (!destinataireId) {
        return res.status(400).json({ success: false, message: 'Le destinataire est requis' });
      }

      const created = await prisma.messages.create({
        data: {
          expediteur_id: currentUserId,
          sender_id: currentUserId,
          destinataire: destinataireId,
          contenu: contenu.trim(),
          priorite: priorite || 'normal',
          created_at: new Date(),
        },
        include: {
          profiles_messages_expediteur_idToprofiles: {
            select: { id: true, nom: true, prenom: true, role: true, avatar_url: true }
          },
          profiles_messages_sender_idToprofiles: {
            select: { id: true, nom: true, prenom: true, role: true, avatar_url: true }
          },
          message_reads: true,
        }
      });

      // Profil du destinataire
      let destinataireProfile = null;
      if (destinataireId !== 'tous') {
        destinataireProfile = await prisma.profiles.findUnique({
          where: { id: destinataireId },
          select: { id: true, nom: true, prenom: true, role: true, avatar_url: true }
        });
      }

      const profilesMap = {};
      if (destinataireProfile) profilesMap[destinataireProfile.id] = destinataireProfile;

      const formatted = formatMessage(created, currentUserId, profilesMap);

      // Notification temps réel via Socket.IO
      const io = req.app.get('io');
      if (io) {
        if (destinataireId === 'tous') {
          io.emit('new_message', formatted);
        } else {
          io.to(`user_${destinataireId}`).emit('new_message', formatted);
          io.to(`user_${currentUserId}`).emit('message_sent', formatted);
        }
      }

      return res.status(201).json({
        success: true,
        data: formatted,
        message: 'Message envoyé avec succès',
      });
    } catch (e) { next(e); }
  });

  /**
   * PATCH /api/messages/:id/lu
   * Marquer un message comme lu
   */
  router.patch('/:id/lu', protect, async (req, res, next) => {
    try {
      const messageId = req.params.id;
      const currentUserId = req.user.id;

      await prisma.message_reads.upsert({
        where: {
          message_id_user_id: {
            message_id: messageId,
            user_id: currentUserId,
          }
        },
        create: {
          message_id: messageId,
          user_id: currentUserId,
          lu_at: new Date(),
        },
        update: {
          lu_at: new Date(),
        }
      });

      return res.status(200).json({ success: true, message: 'Message marqué comme lu' });
    } catch (e) { next(e); }
  });

  /**
   * DELETE /api/messages/:id
   * Supprimer un message
   */
  router.delete('/:id', protect, async (req, res, next) => {
    try {
      const messageId = req.params.id;
      const currentUserId = req.user.id;
      const userRole = (req.user.role || '').toLowerCase();

      // Vérifier propriétaire ou admin/dg
      const msg = await prisma.messages.findUnique({ where: { id: messageId } });
      if (!msg) return res.status(404).json({ success: false, message: 'Message non trouvé' });

      const isSender = (msg.expediteur_id === currentUserId || msg.sender_id === currentUserId);
      const isSuper = ['dg', 'administrateur', 'informatique', 'admin'].includes(userRole);

      if (!isSender && !isSuper) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
      }

      await prisma.messages.delete({ where: { id: messageId } });
      return res.status(200).json({ success: true, message: 'Message supprimé avec succès' });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = createMessagesRoutes;

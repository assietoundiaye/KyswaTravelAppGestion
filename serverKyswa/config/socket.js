/**
 * Configuration Socket.IO
 * Authentification JWT + gestion des rooms et événements temps réel.
 * Version PostgreSQL avec Prisma
 */

const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const prismaService = require('../services/prismaService');

/**
 * Initialise Socket.IO sur le serveur HTTP fourni.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
  });

  // ── Authentification par JWT ──────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const bearerToken = socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.slice(7)
        : null;
      const token = authToken || bearerToken;

      if (!token) return next(new Error('Non authentifié'));

      const decoded = verifyToken(token);
      const user = await prismaService.findFirst('profiles', {
        where: { id: decoded.id },
        select: { 
          id: true, 
          nom: true, 
          prenom: true, 
          role: true,
          actif: true 
        }
      });

      if (!user) return next(new Error('Utilisateur introuvable'));
      if (!user.actif) return next(new Error('Compte désactivé'));

      socket.user = {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
      };

      return next();
    } catch (error) {
      console.error('Socket auth error:', error);
      return next(new Error('Token invalide'));
    }
  });

  // ── Gestion des connexions ────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user_${userId}`);
    console.log(`🔌 Socket connecté: user_${userId}`);

    socket.on('send_message', async (data) => {
      try {
        const message = await prismaService.create('messages', {
          expediteur_id: socket.user.id,
          destinataire_id: data.destinataireId,
          contenu: data.contenu,
          date_envoi: new Date(),
        });

        // Récupérer le message avec les relations
        const fullMessage = await prismaService.findUnique('messages', {
          where: { id: message.id },
          include: {
            expediteur: { select: { nom: true, prenom: true, role: true } },
            destinataire: { select: { nom: true, prenom: true, role: true } }
          }
        });

        io.to(`user_${data.destinataireId}`).emit('new_message', fullMessage);
        socket.emit('message_sent', fullMessage);
      } catch (error) {
        console.error('Message send error:', error);
        socket.emit('message_error', { message: 'Erreur envoi message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket déconnecté: user_${userId}`);
    });
  });

  return io;
}

module.exports = { initSocket };

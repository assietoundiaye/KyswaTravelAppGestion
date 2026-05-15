/**
 * Configuration Socket.IO
 * Authentification JWT + gestion des rooms et événements temps réel.
 */

const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const Utilisateur = require('../models/Utilisateur');
const Message = require('../models/Message');

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
      const user = await Utilisateur.findById(decoded.id).select('_id nom prenom role etat');

      if (!user) return next(new Error('Utilisateur introuvable'));
      if (user.etat === 'INACTIF') return next(new Error('Compte désactivé'));

      socket.user = {
        id: user._id.toString(),
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
      };

      return next();
    } catch {
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
        const message = await Message.create({
          expediteurId: socket.user.id,
          destinataireId: data.destinataireId,
          contenu: data.contenu,
        });
        await message.populate('expediteurId', 'nom prenom role');
        await message.populate('destinataireId', 'nom prenom role');

        io.to(`user_${data.destinataireId}`).emit('new_message', message);
        socket.emit('message_sent', message);
      } catch {
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

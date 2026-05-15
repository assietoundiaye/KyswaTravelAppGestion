const { verifyToken } = require('../utils/jwt');
const Utilisateur = require('../models/Utilisateur');
const { normalizeRole, hasPermission } = require('../config/permissions');

// Middleware: protège une route en exigeant un Bearer token JWT
const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const token = auth.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Token invalide' });
    }

    const user = await Utilisateur.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Utilisateur introuvable' });

    // Bloquer immédiatement si compte désactivé
    if (user.etat === 'INACTIF') {
      return res.status(403).json({ message: 'Compte désactivé. Contactez l\'administrateur.' });
    }

    // Attacher l'utilisateur simplifié à la requête
    req.user = {
      id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      etat: user.etat,
    };

    next();
  } catch (err) {
    console.error('Erreur protect middleware:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Middleware factory: restreint l'accès aux rôles fournis
const requireRole = (...allowedRoles) => {
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
  return (req, res, next) => {
    if (!req.user || !normalizedAllowedRoles.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    next();
  };
};

// Middleware factory: restreint l'accès aux permissions fournies
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const missingPermission = requiredPermissions.find(
      (permission) => !hasPermission(req.user.role, permission)
    );

    if (missingPermission) {
      return res.status(403).json({
        message: 'Accès interdit',
        missingPermission,
      });
    }

    return next();
  };
};

module.exports = { protect, requireRole, requirePermission };
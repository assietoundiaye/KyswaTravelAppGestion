const { verifyToken } = require('../utils/jwt');
const Utilisateur = require('../models/Utilisateur');

/**
 * Middleware de protection : vérifie le token Bearer et charge l'utilisateur complet
 */
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token, process.env.JWT_SECRET);
    if (!decoded) return res.status(401).json({ message: 'Non authentifié' });

    // Charger l'utilisateur complet depuis la DB
    const utilisateur = await Utilisateur.findById(decoded.id).select('-password');
    if (!utilisateur) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    req.user = {
      id: utilisateur._id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email,
      role: utilisateur.role,
      etat: utilisateur.etat,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Non authentifié' });
  }
}

/**
 * Middleware pour vérifier le rôle
 * @param {...String} roles - Rôles autorisés
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    next();
  };
}

module.exports = {
  protect,
  requireRole,
};

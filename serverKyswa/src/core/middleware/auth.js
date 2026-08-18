/**
 * @fileoverview Middleware d'authentification JWT pour l'API backend
 *
 * Vérifie le Bearer token JWT dans l'en-tête Authorization.
 * Compatible avec l'architecture Supabase (profiles.id = auth.users.id).
 */

const jwt = require('jsonwebtoken');
const { AuthenticationException, AuthorizationException } = require('../../shared/exceptions');

/**
 * Middleware de protection des routes
 * Vérifie la validité du JWT et injecte req.user
 */
function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationException('Token d\'authentification requis');
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET non configuré');
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, email, role, nom, prenom }
    next();
  } catch (err) {
    if (err instanceof AuthenticationException || err instanceof AuthorizationException) {
      return next(err);
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AuthenticationException('Token invalide'));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AuthenticationException('Token expiré'));
    }
    return next(new AuthenticationException('Authentification échouée'));
  }
}

/**
 * Middleware de contrôle de rôle
 * @param {...String} roles - Rôles autorisés
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationException('Non authentifié'));
    }
    const userRole = (req.user.role || '').toLowerCase();
    const allowed = roles.map(r => r.toLowerCase());
    if (!allowed.includes(userRole)) {
      return next(new AuthorizationException(
        `Accès refusé. Rôle(s) requis: ${roles.join(', ')}`
      ));
    }
    next();
  };
}

/**
 * Middleware optionnel (ne bloque pas si pas de token)
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch {
    // Ignore — auth optionnelle
  }
  next();
}

module.exports = { protect, requireRole, optionalAuth };

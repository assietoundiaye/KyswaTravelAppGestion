/**
 * @fileoverview Middleware de gestion d'erreurs centralisé
 * Intercepte toutes les exceptions remontées via next(error)
 */

const {
  AppException,
  ValidationException,
  AuthenticationException,
  AuthorizationException,
  NotFoundException,
  ConflictException,
} = require('../../shared/exceptions');

/**
 * Handler global d'erreurs Express
 */
function errorHandler(err, req, res, next) {
  // Log l'erreur
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ErrorHandler] ${err.constructor.name}: ${err.message}`);
    if (err.stack) console.error(err.stack);
  }

  // Erreurs applicatives connues
  if (err instanceof ValidationException) {
    return res.status(400).json({
      success: false,
      error: 'Validation',
      message: err.message,
      details: err.details || null
    });
  }

  if (err instanceof AuthenticationException) {
    return res.status(401).json({
      success: false,
      error: 'Authentication',
      message: err.message
    });
  }

  if (err instanceof AuthorizationException) {
    return res.status(403).json({
      success: false,
      error: 'Authorization',
      message: err.message
    });
  }

  if (err instanceof NotFoundException) {
    return res.status(404).json({
      success: false,
      error: 'NotFound',
      message: err.message
    });
  }

  if (err instanceof ConflictException) {
    return res.status(409).json({
      success: false,
      error: 'Conflict',
      message: err.message
    });
  }

  // Erreurs Prisma
  if (err.code) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Une entrée avec ces données existe déjà',
        field: err.meta?.target
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Enregistrement non trouvé'
      });
    }
  }

  // Erreur générique
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    success: false,
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'production'
      ? 'Une erreur interne est survenue'
      : err.message
  });
}

module.exports = { errorHandler };

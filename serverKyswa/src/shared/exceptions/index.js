/**
 * @fileoverview Exceptions personnalisées pour l'application
 * Centralisées pour une meilleure gestion d'erreurs
 */

/**
 * Exception de base personnalisée
 */
class AppException extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppException';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Erreur de validation
 */
class ValidationException extends AppException {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationException';
    this.errors = errors;
  }
}

/**
 * Erreur d'authentification
 */
class AuthenticationException extends AppException {
  constructor(message = 'Non authentifié') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationException';
  }
}

/**
 * Erreur d'autorisation (rôle/permissions)
 */
class AuthorizationException extends AppException {
  constructor(message = 'Accès refusé') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationException';
  }
}

/**
 * Ressource non trouvée
 */
class NotFoundException extends AppException {
  constructor(message = 'Ressource non trouvée') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundException';
  }
}

/**
 * Erreur métier (logique applicative)
 */
class BusinessException extends AppException {
  constructor(message, code = 'BUSINESS_ERROR') {
    super(message, 400, code);
    this.name = 'BusinessException';
  }
}

/**
 * Conflit de données (ex: email déjà existant)
 */
class ConflictException extends AppException {
  constructor(message = 'Conflit de données') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictException';
  }
}

/**
 * Erreur interne du serveur
 */
class InternalServerException extends AppException {
  constructor(message = 'Erreur interne du serveur') {
    super(message, 500, 'INTERNAL_ERROR');
    this.name = 'InternalServerException';
  }
}

module.exports = {
  AppException,
  ValidationException,
  AuthenticationException,
  AuthorizationException,
  NotFoundException,
  BusinessException,
  ConflictException,
  InternalServerException,
};

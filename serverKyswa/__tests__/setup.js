/**
 * Configuration globale pour les tests Jest
 */

// Augmenter le timeout pour les tests avec base de données
jest.setTimeout(30000);

// Variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

// Mock console pour réduire le bruit dans les tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

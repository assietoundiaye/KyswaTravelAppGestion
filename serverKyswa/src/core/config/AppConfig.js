/**
 * @fileoverview Gestionnaire de configuration et d'initialisation
 * Centralise la configuration de l'application
 */

const path = require('path');

class AppConfig {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.isDev = this.env === 'development';
    this.isProd = this.env === 'production';
  }

  /**
   * Obtenir la configuration complète
   */
  getConfig() {
    return {
      env: this.env,
      port: process.env.PORT || 3000,
      mongoUri: process.env.MONGO_URI,
      jwtSecret: process.env.JWT_SECRET || 'dev-secret',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
      cloudinaryName: process.env.CLOUDINARY_NAME,
      cloudinaryKey: process.env.CLOUDINARY_KEY,
      cloudinarySecret: process.env.CLOUDINARY_SECRET,
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      isDev: this.isDev,
      isProd: this.isProd,
    };
  }

  /**
   * Valider les variables d'environnement requises
   */
  validateEnvironment() {
    const required = ['JWT_SECRET']; // Suppression de MONGO_URI

    if (this.isProd) {
      required.push('CLOUDINARY_NAME', 'CLOUDINARY_KEY', 'CLOUDINARY_SECRET');
    }

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
    }
  }
}

module.exports = AppConfig;

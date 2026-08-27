/**
 * Configuration Email avec Nodemailer
 */

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initialiser le transporteur email
 */
function initEmailTransporter() {
  if (transporter) return transporter;

  // Configuration selon le provider
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true pour 465, false pour autres ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // En développement, utiliser Ethereal Email (test)
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
    console.log('⚠️  Mode développement : Emails simulés (pas d\'envoi réel)');
    return null;
  }

  try {
    transporter = nodemailer.createTransporter(emailConfig);
    
    // Vérifier la configuration
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Configuration email invalide:', error.message);
        transporter = null;
      } else {
        console.log('✅ Serveur email prêt');
      }
    });

    return transporter;
  } catch (err) {
    console.error('❌ Erreur initialisation email:', err.message);
    return null;
  }
}

/**
 * Obtenir le transporteur email
 */
function getEmailTransporter() {
  if (!transporter) {
    return initEmailTransporter();
  }
  return transporter;
}

/**
 * Vérifier si l'email est configuré
 */
function isEmailConfigured() {
  return transporter !== null && process.env.SMTP_USER;
}

module.exports = {
  initEmailTransporter,
  getEmailTransporter,
  isEmailConfigured,
};
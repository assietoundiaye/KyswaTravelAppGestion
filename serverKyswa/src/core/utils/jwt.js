/**
 * @fileoverview Utilitaires JWT centralisés pour le backend
 */

const jwt = require('jsonwebtoken');

function generateToken(user) {
  const userId = user.id || user._id;
  const payload = {
    id: userId,
    email: user.email,
    role: user.role,
    nom: user.nom || '',
    prenom: user.prenom || '',
  };
  const secret = process.env.JWT_SECRET || 'kyswa_secret_key_change_me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '2h';

  return jwt.sign(payload, secret, { expiresIn });
}

function generateRefreshToken(user) {
  const userId = user.id || user._id;
  const payload = { id: userId };
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'kyswa_secret_key_change_me';
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '1d';

  return jwt.sign(payload, secret, { expiresIn });
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'kyswa_secret_key_change_me';
  return jwt.verify(token, secret);
}

function verifyRefreshToken(token) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'kyswa_secret_key_change_me';
  return jwt.verify(token, secret);
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
};

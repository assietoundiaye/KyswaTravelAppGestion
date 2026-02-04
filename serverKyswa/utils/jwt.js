const jwt = require('jsonwebtoken');

/**
 * Génère un JWT pour un utilisateur
 * @param {Object} user - Objet utilisateur (doit contenir _id et role)
 * @returns {String} Token JWT
 */
function generateToken(user) {
  const payload = {
    id: user._id,
    role: user.role,
  };

  const secret = process.env.JWT_SECRET || 'kyswa_secret_key_change_in_production';
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });

  return token;
}

/**
 * Vérifie et décode un JWT
 * @param {String} token - Token JWT
 * @returns {Object} Payload décodé
 */
function verifyToken(token, secretOverride) {
  const secret = secretOverride || process.env.JWT_SECRET || 'kyswa_secret_key_change_in_production';
  return jwt.verify(token, secret);
}

module.exports = {
  generateToken,
  verifyToken,
};

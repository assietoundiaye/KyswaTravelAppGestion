const jwt = require('jsonwebtoken');

/**
 * Génère un JWT pour un utilisateur
 * @param {Object} user - Objet utilisateur (doit contenir _id et role)
 * @returns {String} Token JWT
 */
function generateToken(user) {
  const payload = { id: user._id, role: user.role, nom: user.nom, prenom: user.prenom };
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET non configuré");
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign(payload, secret, { expiresIn });
}

function generateRefreshToken(user) {
  const payload = { id: user._id };
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET non configuré");
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Vérifie et décode un JWT
 * @param {String} token - Token JWT
 * @param {String} [secretOverride] - Optionnel : clé de secours
 * @returns {Object} Payload décodé
 */
function verifyToken(token, secretOverride) {
  // 3. Correction : Suppression de la clé 'kyswa_secret_key...' qui était exposée
  const secret = secretOverride || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Clé secrète manquante pour la vérification du token.");
  }

  return jwt.verify(token, secret);
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
};
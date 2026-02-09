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

  // 1. Correction : Utiliser process.env sans valeur par défaut "en dur"
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("La variable JWT_SECRET n'est pas configurée dans l'environnement !");
  }

  // 2. Utilisation de jwt.sign pour créer le jeton (7 jours de validité)
  return jwt.sign(payload, secret, { expiresIn: '7d' });
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
  verifyToken,
};
const AuditLog = require('../models/AuditLog');

/**
 * Enregistre une action dans les audit_logs
 * @param {Object} user - req.user
 * @param {string} action - CREATE | UPDATE | DELETE | LOGIN | LOGOUT | VIEW
 * @param {string} module - CLIENT | RESERVATION | BILLET | PAIEMENT | PACKAGE | ...
 * @param {Object} details - données supplémentaires (optionnel)
 */
async function logAction(user, action, module, details = {}) {
  try {
    await AuditLog.create({
      userId: user.id,
      userNom: `${user.prenom || ''} ${user.nom || ''}`.trim(),
      action,
      module,
      details,
    });
  } catch (err) {
    // Ne pas bloquer l'opération principale si le log échoue
    console.error('Erreur audit log:', err.message);
  }
}

module.exports = { logAction };

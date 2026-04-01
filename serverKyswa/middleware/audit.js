const AuditLog = require('../models/AuditLog');

// Map method + path → action
function getAction(method, path) {
  if (path.includes('/login')) return 'LOGIN';
  if (path.includes('/logout')) return 'LOGOUT';
  if (method === 'POST') return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  if (method === 'GET') return 'VIEW';
  return 'VIEW';
}

// Map path → module
function getModule(path) {
  if (path.includes('/auth')) return 'AUTH';
  if (path.includes('/clients')) return 'CLIENT';
  if (path.includes('/reservations')) return 'RESERVATION';
  if (path.includes('/billets-groupe')) return 'BILLET';
  if (path.includes('/billets')) return 'BILLET';
  if (path.includes('/paiements')) return 'PAIEMENT';
  if (path.includes('/packages')) return 'PACKAGE';
  if (path.includes('/supplements')) return 'SUPPLEMENT';
  if (path.includes('/documents')) return 'DOCUMENT';
  if (path.includes('/users')) return 'UTILISATEUR';
  if (path.includes('/rapports')) return 'RAPPORTS';
  if (path.includes('/visas')) return 'RESERVATION';
  if (path.includes('/desistements')) return 'RESERVATION';
  if (path.includes('/reunions')) return 'RESERVATION';
  return 'AUTH';
}

/**
 * Middleware d'audit — enregistre les actions POST/PATCH/PUT/DELETE
 * À placer après protect() sur les routes sensibles
 */
const auditMiddleware = (req, res, next) => {
  // Ne logger que les mutations (pas les GET sauf login)
  const isLogin = req.path.includes('/login');
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

  if (!isMutation && !isLogin) return next();

  // Intercepter la réponse pour ne logger qu'en cas de succès
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    // Logger seulement si succès (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      const action = getAction(req.method, req.path);
      const module = getModule(req.path);

      // Construire les détails sans données sensibles
      const details = {};
      if (req.params?.id) details.id = req.params.id;
      if (req.body) {
        const safe = { ...req.body };
        delete safe.password;
        delete safe.token;
        // Limiter la taille
        const keys = Object.keys(safe).slice(0, 5);
        keys.forEach(k => { details[k] = safe[k]; });
      }

      // Enregistrement asynchrone (ne bloque pas la réponse)
      AuditLog.create({
        userId: req.user.id,
        userNom: `${req.user.prenom || ''} ${req.user.nom || ''}`.trim(),
        action,
        module,
        details,
      }).catch(err => console.error('Audit log error:', err));
    }

    return originalJson(body);
  };

  next();
};

/**
 * Logger spécifique pour la connexion (appelé depuis auth.js)
 */
const logLogin = async (userId, userNom, details = {}) => {
  try {
    await AuditLog.create({
      userId,
      userNom,
      action: 'LOGIN',
      module: 'AUTH',
      details,
    });
  } catch (err) {
    console.error('Audit login error:', err);
  }
};

module.exports = { auditMiddleware, logLogin };

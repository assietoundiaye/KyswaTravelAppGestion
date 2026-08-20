/**
 * @fileoverview Middleware Audit — Enregistre automatiquement toutes les mutations (POST, PUT, PATCH, DELETE)
 * et les connexions (LOGIN) dans la table `audit_logs` avec les noms de modules canoniques.
 */

const prisma = require('../../database/client');

// Mapper les verbes HTTP vers les actions lisibles
function getActionName(method, path) {
  if (path.includes('/login')) return 'CONNEXION';
  if (path.includes('/logout')) return 'DECONNEXION';
  if (method === 'POST') return 'CREATION';
  if (method === 'PUT' || method === 'PATCH') return 'MODIFICATION';
  if (method === 'DELETE') return 'SUPPRESSION';
  return 'CONSULTATION';
}

// Mapper les chemins d'URL vers les clés de modules exactes attendues par le frontend
function getModuleName(path) {
  const p = path.toLowerCase();
  if (p.includes('/auth')) return 'auth';
  if (p.includes('/clients')) return 'clients';
  if (p.includes('/reservations')) return 'inscriptions';
  if (p.includes('/paiements')) return 'paiements';
  if (p.includes('/packages') || p.includes('/departs')) return 'departs';
  if (p.includes('/visas')) return 'visas';
  if (p.includes('/billets')) return 'billets';
  if (p.includes('/comptabilite')) return 'comptabilite';
  if (p.includes('/desistements')) return 'desistements';
  if (p.includes('/recouvrement')) return 'recouvrement';
  if (p.includes('/documents')) return 'documents';
  if (p.includes('/rapports')) return 'rapports';
  if (p.includes('/reunions')) return 'reunion';
  if (p.includes('/shop')) return 'shop';
  if (p.includes('/users') || p.includes('/profile')) return 'utilisateurs';
  if (p.includes('/supplements')) return 'supplements';
  if (p.includes('/ziarra')) return 'ziarra';
  return 'auth';
}

function auditMiddleware(req, res, next) {
  // Ne pas enregister l'audit de la consultation du journal d'audit ni des scans OCR
  if (req.path.startsWith('/api/audit') || req.path.includes('/scan-document')) {
    return next();
  }

  const isLogin = req.path.includes('/login');
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

  // Seulement logger les mutations et connexions
  if (!isMutation && !isLogin) {
    return next();
  }

  // Intercepter res.json() pour n'enregistrer qu'en cas de succès (status 2xx)
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const user = req.user;
      const userId = user?.id || body?.user?.id || body?.data?.id || null;
      
      let userNom = 'Visiteur';
      if (user) {
        userNom = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email;
      } else if (body?.user) {
        userNom = `${body.user.prenom || ''} ${body.user.nom || ''}`.trim() || body.user.email;
      } else if (req.body?.email) {
        userNom = req.body.email;
      }

      const userRole = user?.role || body?.user?.role || 'visiteur';

      const action = getActionName(req.method, req.path);
      const moduleName = getModuleName(req.path);

      // Détails nettoyés sans données sensibles (mots de passe, tokens)
      const details = {};
      if (req.params && Object.keys(req.params).length > 0) {
        details.params = req.params;
      }
      if (req.body && typeof req.body === 'object') {
        const safeBody = { ...req.body };
        delete safeBody.password;
        delete safeBody.ancienPassword;
        delete safeBody.nouveauPassword;
        delete safeBody.token;
        delete safeBody.refreshToken;
        // Limiter la taille pour l'audit
        const keys = Object.keys(safeBody).slice(0, 8);
        details.payload = {};
        keys.forEach(k => { details.payload[k] = safeBody[k]; });
      }

      // Insertion asynchrone non-bloquante dans audit_logs
      prisma.audit_logs.create({
        data: {
          user_id: userId,
          user_nom: userNom,
          user_role: userRole,
          action: action,
          module: moduleName,
          details: details,
          created_at: new Date()
        }
      }).catch(err => {
        console.error('[AuditMiddleware] Erreur création log:', err.message);
      });
    }

    return originalJson(body);
  };

  next();
}

module.exports = auditMiddleware;

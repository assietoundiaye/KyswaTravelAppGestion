/**
 * @fileoverview Middleware Audit — Enregistre automatiquement toutes les mutations (POST, PUT, PATCH, DELETE)
 * et les connexions (LOGIN) dans la table `audit_logs` avec les noms de modules canoniques.
 */

const prisma = require('../../database/client');

// Mapper les verbes HTTP vers les actions lisibles
function getActionName(method, fullUrl) {
  const p = (fullUrl || '').toLowerCase();
  if (p.includes('/login')) return 'CONNEXION';
  if (p.includes('/logout')) return 'DECONNEXION';
  if (method === 'POST') return 'CREATION';
  if (method === 'PUT' || method === 'PATCH') return 'MODIFICATION';
  if (method === 'DELETE') return 'SUPPRESSION';
  return 'CONSULTATION';
}

// Mapper les chemins d'URL complets vers les clés de modules exactes attendues par le frontend
function getModuleName(fullUrl, body = {}) {
  const p = (fullUrl || '').toLowerCase();

  // Mappings par URL exacte
  if (p.includes('/clients')) return 'clients';
  if (p.includes('/reservations') || p.includes('/inscriptions')) return 'inscriptions';
  if (p.includes('/paiements')) return 'paiements';
  if (p.includes('/packages') || p.includes('/departs')) return 'departs';
  if (p.includes('/visas')) return 'visas';
  if (p.includes('/billets-groupe')) return 'billets-groupe';
  if (p.includes('/billets')) return 'billets';
  if (p.includes('/factures')) return 'factures';
  if (p.includes('/comptabilite') || p.includes('/depenses') || p.includes('/recettes') || p.includes('/caisse')) return 'comptabilite';
  if (p.includes('/desistements') || p.includes('/remboursements')) return 'desistements';
  if (p.includes('/recouvrement') || p.includes('/relances')) return 'recouvrement';
  if (p.includes('/documents') || p.includes('/secretaire')) return 'documents';
  if (p.includes('/rapports') || p.includes('/bilan')) return 'rapports';
  if (p.includes('/reunions')) return 'reunions';
  if (p.includes('/shop')) return 'shop';
  if (p.includes('/users') || p.includes('/utilisateurs') || p.includes('/permissions') || p.includes('/profile') || p.includes('/profil')) return 'utilisateurs';
  if (p.includes('/supplements')) return 'supplements';
  if (p.includes('/ziarra')) return 'ziarra';
  if (p.includes('/simulateur')) return 'simulateur';
  if (p.includes('/statistiques')) return 'statistiques';
  if (p.includes('/taches')) return 'taches';
  if (p.includes('/auth') || p.includes('/login') || p.includes('/logout') || p.includes('/register') || p.includes('/refresh')) return 'auth';

  // Détection de secours basée sur le contenu du payload
  if (body && typeof body === 'object') {
    if (body.dateReunion || body.date_reunion || body.ordreJour) return 'reunions';
    if (body.numeroPasseport || body.n_passeport || body.dateExpirationPasseport) return 'clients';
    if (body.reservationId || body.dateProchaineRelance || body.resultat) return 'recouvrement';
    if (body.motifDesistement || body.pctRemboursement || body.montantRetenu) return 'desistements';
    if (body.montant && body.modePaiement) return 'paiements';
    if (body.nomReference || body.quotaMax || body.dateDepart) return 'departs';
    if (body.role && (body.email || body.poste)) return 'utilisateurs';
  }

  return 'systeme';
}

function auditMiddleware(req, res, next) {
  const fullUrl = req.originalUrl || req.baseUrl + req.path || req.url || req.path || '';

  // Ne pas enregistrer l'audit de la consultation du journal d'audit ni des scans OCR
  if (fullUrl.startsWith('/api/audit') || fullUrl.includes('/scan-document')) {
    return next();
  }

  const isLogin = fullUrl.includes('/login') || fullUrl.includes('/logout');
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
      const action = getActionName(req.method, fullUrl);
      const moduleName = getModuleName(fullUrl, req.body);

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
        const keys = Object.keys(safeBody).slice(0, 10);
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


/**
 * @fileoverview Routes — Module rapports quotidiens
 */
const express = require('express');
const prismaClient = require('../../database/client');
const { protect, requireRole } = require('../../core/middleware/auth');

function createRapportsRoutes() {
  const router = express.Router();

  /**
   * Helper pour mapper un enregistrement Prisma rapports_quotidiens vers le format Frontend
   */
  function mapRapportToFrontend(r) {
    if (!r) return null;
    const profile = r.profiles_rapports_quotidiens_user_idToprofiles || r.profiles_rapports_quotidiens_agent_idToprofiles || {};
    const agentUserId = r.user_id || r.agent_id || '';

    return {
      _id: r.id,
      id: r.id,
      date: r.date_rapport,
      dateCreation: r.created_at || r.date_rapport,
      activites: r.activites || r.taches_accomplies || '',
      problemes: r.problemes || '',
      objectifsDemain: r.objectifs || r.previsions_demain || '',
      notes: r.notes || '',
      appelsClients: r.clients_vus || 0,
      inscriptionsCreees: r.inscriptions_jour || 0,
      paiementsEncaisses: r.ca_jour ? Number(r.ca_jour) : 0,
      suiviCommercial: r.suivi_commercial || '',
      constats: r.constats_suggestions || '',
      appelsDetail: Array.isArray(r.appels_clients) ? r.appels_clients : [],
      publications: r.nb_publications || 0,
      vues: r.stats_vues || 0,
      abonnesGagnes: r.stats_abonnes || 0,
      likes: r.stats_likes || 0,
      campagnesActives: Number(r.campagnes_actives || 0),
      budgetCampagne: r.budget_campagne || 0,
      plateformes: Array.isArray(r.plateformes) ? r.plateformes : [],
      articlesPub: r.articles_publies || 0,
      packagesMAJ: r.packages_maj || 0,
      etatSite: r.etat_site || '',
      problemesRegles: r.problemes_regles || '',
      agentId: {
        _id: agentUserId,
        id: agentUserId,
        nom: profile.nom || '',
        prenom: profile.prenom || '',
        role: profile.role || '',
      }
    };
  }

  // ─────────────────────────────────────────────────────
  // GET /api/rapports/dashboard
  // Résumé pour tableau de bord rapports
  // ─────────────────────────────────────────────────────
  router.get('/dashboard', protect, async (req, res, next) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const userRole = req.user?.role;
      const userId = req.user?.id;
      const isAdmin = ['dg', 'secretaire', 'administrateur', 'admin'].includes(userRole);

      // Trouve le rapport d'aujourd'hui pour l'utilisateur connecté
      const rapportAujourdhuiRaw = await prismaClient.rapports_quotidiens.findFirst({
        where: {
          date_rapport: { gte: today },
          OR: [
            { user_id: userId },
            { agent_id: userId }
          ]
        },
        include: {
          profiles_rapports_quotidiens_user_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } },
          profiles_rapports_quotidiens_agent_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } }
        },
        orderBy: { created_at: 'desc' }
      });

      const monRapportAujourdhui = mapRapportToFrontend(rapportAujourdhuiRaw);

      let employesFormatted = [];

      if (isAdmin) {
        // Pour les admins: récupérer tous les profils (employés) et vérifier s'ils ont soumis aujourd'hui
        const [usersRaw, rapportsTodayRaw] = await Promise.all([
          prismaClient.profiles.findMany({
            select: { id: true, nom: true, prenom: true, role: true }
          }),
          prismaClient.rapports_quotidiens.findMany({
            where: { date_rapport: { gte: today } },
            include: {
              profiles_rapports_quotidiens_user_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } },
              profiles_rapports_quotidiens_agent_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } }
            }
          })
        ]);

        const mapRapportsByUserId = {};
        for (const r of rapportsTodayRaw) {
          const uid = r.user_id || r.agent_id;
          if (uid) mapRapportsByUserId[uid] = mapRapportToFrontend(r);
        }

        employesFormatted = usersRaw.map(u => ({
          employe: {
            id: u.id,
            _id: u.id,
            nom: u.nom || '',
            prenom: u.prenom || '',
            role: u.role || 'agent'
          },
          statut: mapRapportsByUserId[u.id] ? 'RENDU' : 'NON_RENDU',
          rapport: mapRapportsByUserId[u.id] || null
        }));
      } else {
        // Pour un utilisateur normal
        const profileRaw = await prismaClient.profiles.findUnique({
          where: { id: userId },
          select: { id: true, nom: true, prenom: true, role: true }
        }).catch(() => null);

        employesFormatted = [{
          employe: {
            id: userId,
            _id: userId,
            nom: profileRaw?.nom || req.user?.nom || '',
            prenom: profileRaw?.prenom || req.user?.prenom || '',
            role: profileRaw?.role || req.user?.role || ''
          },
          statut: monRapportAujourdhui ? 'RENDU' : 'NON_RENDU',
          rapport: monRapportAujourdhui
        }];
      }

      const totalRapports = await prismaClient.rapports_quotidiens.count({
        where: isAdmin ? {} : { OR: [{ user_id: userId }, { agent_id: userId }] }
      });

      res.json({
        success: true,
        employes: employesFormatted,
        stats: {
          rapportAujourdhui: monRapportAujourdhui,
          totalRapports,
        }
      });
    } catch (e) { next(e); }
  });

  // ─────────────────────────────────────────────────────
  // GET /api/rapports
  // Liste des rapports quotidiens (filtrée par rôle + date optionnelle)
  // ─────────────────────────────────────────────────────
  router.get('/', protect, async (req, res, next) => {
    try {
      const { page = 1, limit = 100, date } = req.query;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      const isAdmin = ['dg', 'secretaire', 'administrateur', 'admin'].includes(userRole);

      let where = isAdmin ? {} : {
        OR: [
          { user_id: userId },
          { agent_id: userId }
        ]
      };

      if (date) {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          d.setHours(0, 0, 0, 0);
          const endD = new Date(d);
          endD.setHours(23, 59, 59, 999);

          where = {
            ...where,
            date_rapport: {
              gte: d,
              lte: endD
            }
          };
        }
      }

      const listRaw = await prismaClient.rapports_quotidiens.findMany({
        where,
        take: parseInt(limit, 10),
        skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        include: {
          profiles_rapports_quotidiens_user_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } },
          profiles_rapports_quotidiens_agent_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } }
        },
        orderBy: { date_rapport: 'desc' }
      });

      const total = await prismaClient.rapports_quotidiens.count({ where });
      const rapports = listRaw.map(mapRapportToFrontend);

      res.json({
        success: true,
        data: rapports,
        rapports,
        total
      });
    } catch (e) { next(e); }
  });

  // ─────────────────────────────────────────────────────
  // GET /api/rapports/:id
  // Rapport par ID
  // ─────────────────────────────────────────────────────
  router.get('/:id', protect, async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      const isAdmin = ['dg', 'secretaire', 'administrateur', 'admin'].includes(userRole);

      const itemRaw = await prismaClient.rapports_quotidiens.findUnique({
        where: { id: req.params.id },
        include: {
          profiles_rapports_quotidiens_user_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } },
          profiles_rapports_quotidiens_agent_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } }
        }
      });

      if (!itemRaw) return res.status(404).json({ success: false, message: 'Rapport non trouvé' });

      if (!isAdmin && itemRaw.user_id !== userId && itemRaw.agent_id !== userId) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à ce rapport' });
      }

      const item = mapRapportToFrontend(itemRaw);
      res.json({ success: true, data: item, rapport: item });
    } catch (e) { next(e); }
  });

  // ─────────────────────────────────────────────────────
  // POST /api/rapports
  // Soumettre / Mettre à jour (UPSERT) le rapport du jour de l'agent
  // ─────────────────────────────────────────────────────
  router.post('/', protect, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
      }

      // Date du jour (00:00:00)
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      // Données de mise à jour / création
      const payload = {
        activites: req.body.activites || '',
        taches_accomplies: req.body.activites || '',
        problemes: req.body.problemes || '',
        objectifs: req.body.objectifsDemain || '',
        previsions_demain: req.body.objectifsDemain || '',
        notes: req.body.notes || '',
        clients_vus: parseInt(req.body.appelsClients || 0, 10),
        inscriptions_jour: parseInt(req.body.inscriptionsCreees || 0, 10),
        ca_jour: BigInt(req.body.paiementsEncaisses || 0),
        suivi_commercial: req.body.suiviCommercial || '',
        constats_suggestions: req.body.constats || '',
        appels_clients: Array.isArray(req.body.appelsDetail) ? req.body.appelsDetail : [],
        nb_publications: parseInt(req.body.publications || 0, 10),
        stats_vues: parseInt(req.body.vues || 0, 10),
        stats_abonnes: parseInt(req.body.abonnesGagnes || 0, 10),
        stats_likes: parseInt(req.body.likes || 0, 10),
        campagnes_actives: String(req.body.campagnesActives || '0'),
        budget_campagne: parseInt(req.body.budgetCampagne || 0, 10),
        plateformes: Array.isArray(req.body.plateformes) ? req.body.plateformes : [],
        articles_publies: parseInt(req.body.articlesPub || 0, 10),
        packages_maj: parseInt(req.body.packagesMAJ || 0, 10),
        etat_site: req.body.etatSite || '',
        problemes_regles: req.body.problemesRegles || '',
      };

      // Chercher rapport existant pour cet agent aujourd'hui
      const existing = await prismaClient.rapports_quotidiens.findFirst({
        where: {
          date_rapport: todayDate,
          OR: [
            { user_id: userId },
            { agent_id: userId }
          ]
        }
      });

      let rapportPrisma;
      let action = 'CREATE';
      let message = 'Rapport soumis avec succès';

      if (existing) {
        action = 'UPDATE';
        message = 'Rapport mis à jour avec succès';
        rapportPrisma = await prismaClient.rapports_quotidiens.update({
          where: { id: existing.id },
          data: payload,
          include: {
            profiles_rapports_quotidiens_user_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } },
            profiles_rapports_quotidiens_agent_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } }
          }
        });
      } else {
        rapportPrisma = await prismaClient.rapports_quotidiens.create({
          data: {
            ...payload,
            user_id: userId,
            agent_id: userId,
            date_rapport: todayDate,
          },
          include: {
            profiles_rapports_quotidiens_user_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } },
            profiles_rapports_quotidiens_agent_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } }
          }
        });
      }

      const formatted = mapRapportToFrontend(rapportPrisma);

      res.status(action === 'CREATE' ? 201 : 200).json({
        success: true,
        action,
        message,
        data: formatted,
        rapport: formatted
      });
    } catch (e) { next(e); }
  });

  // ─────────────────────────────────────────────────────
  // PATCH /api/rapports/:id
  // Modifier par ID (avec vérification propriétaire)
  // ─────────────────────────────────────────────────────
  router.patch('/:id', protect, async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      const isAdmin = ['dg', 'secretaire', 'administrateur', 'admin'].includes(userRole);

      const existing = await prismaClient.rapports_quotidiens.findUnique({
        where: { id: req.params.id }
      });

      if (!existing) return res.status(404).json({ success: false, message: 'Rapport non trouvé' });

      if (!isAdmin && existing.user_id !== userId && existing.agent_id !== userId) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à ce rapport' });
      }

      const payload = {};
      if (req.body.activites !== undefined) {
        payload.activites = req.body.activites;
        payload.taches_accomplies = req.body.activites;
      }
      if (req.body.problemes !== undefined) payload.problemes = req.body.problemes;
      if (req.body.objectifsDemain !== undefined) {
        payload.objectifs = req.body.objectifsDemain;
        payload.previsions_demain = req.body.objectifsDemain;
      }
      if (req.body.notes !== undefined) payload.notes = req.body.notes;
      if (req.body.appelsClients !== undefined) payload.clients_vus = parseInt(req.body.appelsClients, 10);
      if (req.body.inscriptionsCreees !== undefined) payload.inscriptions_jour = parseInt(req.body.inscriptionsCreees, 10);
      if (req.body.paiementsEncaisses !== undefined) payload.ca_jour = BigInt(req.body.paiementsEncaisses);
      if (req.body.suiviCommercial !== undefined) payload.suivi_commercial = req.body.suiviCommercial;
      if (req.body.constats !== undefined) payload.constats_suggestions = req.body.constats;
      if (req.body.appelsDetail !== undefined) payload.appels_clients = req.body.appelsDetail;

      const updated = await prismaClient.rapports_quotidiens.update({
        where: { id: req.params.id },
        data: payload,
        include: {
          profiles_rapports_quotidiens_user_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } },
          profiles_rapports_quotidiens_agent_idToprofiles: { select: { id: true, nom: true, prenom: true, role: true } }
        }
      });

      const formatted = mapRapportToFrontend(updated);
      res.json({ success: true, data: formatted, rapport: formatted });
    } catch (e) { next(e); }
  });

  // ─────────────────────────────────────────────────────
  // DELETE /api/rapports/:id
  // Supprimer un rapport (Supervision)
  // ─────────────────────────────────────────────────────
  router.delete('/:id', protect, requireRole('admin', 'dg', 'informatique'), async (req, res, next) => {
    try {
      await prismaClient.rapports_quotidiens.delete({
        where: { id: req.params.id }
      });
      res.json({ success: true, message: 'Rapport supprimé avec succès' });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = createRapportsRoutes;

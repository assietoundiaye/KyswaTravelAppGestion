const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const RapportQuotidien = require('../models/RapportQuotidien');
const Utilisateur = require('../models/Utilisateur');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

/**
 * GET /api/rapports/dashboard
 * Métriques pour le dashboard avec agrégations
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Permettre l'accès à tous les utilisateurs connectés
    // Les admins voient tout, les autres voient seulement leurs propres rapports
    const rolesAdmin = ['secretaire', 'dg', 'administrateur'];
    const isAdmin = rolesAdmin.includes(req.user.role);

    // Créer les bornes du jour actuel en UTC
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const startOfDay = new Date(todayStr + 'T00:00:00.000Z');
    const endOfDay = new Date(todayStr + 'T23:59:59.999Z');

    console.log('GET /dashboard - Recherche rapports entre:', startOfDay, 'et', endOfDay);
    console.log('GET /dashboard - Utilisateur:', req.user.role, 'ID:', req.user.id, 'Admin:', isAdmin);

    if (isAdmin) {
      // Pour les admins: récupérer tous les employés et leurs rapports
      // Le secrétaire voit tous les rapports sauf celui du DG
      // Le DG voit tous les rapports y compris le sien
      let employeeFilter = { etat: 'ACTIF' };
      
      if (req.user.role === 'secretaire') {
        // Le secrétaire voit TOUS les employés y compris le DG, sauf les administrateurs
        employeeFilter.role = { $nin: ['administrateur'] };
        console.log('GET /dashboard - Filtre pour secrétaire: exclut seulement administrateur, inclut DG');
      } else if (req.user.role === 'dg') {
        // Le DG voit tous les employés sauf les administrateurs
        employeeFilter.role = { $nin: ['administrateur'] };
        console.log('GET /dashboard - Filtre pour DG: exclut administrateur');
      } else {
        // Les administrateurs voient tous les employés sauf le DG
        employeeFilter.role = { $nin: ['dg'] };
        console.log('GET /dashboard - Filtre pour administrateur: exclut dg');
      }
      
      const employes = await Utilisateur.find(employeeFilter).select('nom prenom role');
      
      console.log('GET /dashboard - Employés trouvés avec filtre:', employes.length);
      employes.forEach(emp => {
        console.log(`  - ${emp.prenom} ${emp.nom} (${emp.role})`);
      });

      console.log('GET /dashboard - Employés trouvés:', employes.length);

      // Récupérer les rapports du jour avec populate
      const rapportsDuJour = await RapportQuotidien.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      }).populate('agentId', 'nom prenom role');

      console.log('GET /dashboard - Rapports du jour trouvés:', rapportsDuJour.length);

      // Créer la structure pour le dashboard admin
      const dashboard = employes.map(emp => {
        const rapport = rapportsDuJour.find(r => 
          r.agentId && r.agentId._id.toString() === emp._id.toString()
        );

        const employeData = {
          employe: {
            id: emp._id,
            nom: emp.nom,
            prenom: emp.prenom,
            role: emp.role
          },
          rapport: rapport ? {
            id: rapport._id,
            activites: rapport.activites?.substring(0, 100),
            statutJournee: rapport.statutJournee,
            dateCreation: rapport.dateCreation,
            metriques: getRoleMetrics(rapport, emp.role)
          } : null,
          statut: rapport ? 'RENDU' : 'EN_ATTENTE'
        };

        console.log(`GET /dashboard - Employé ${emp.prenom} ${emp.nom}: ${employeData.statut}`);
        
        return employeData;
      });

      // Statistiques globales
      const stats = {
        totalEmployes: employes.length,
        rapportsRendus: rapportsDuJour.length,
        tauxCompletion: employes.length > 0 ? Math.round((rapportsDuJour.length / employes.length) * 100) : 0,
        parStatut: {
          PRODUCTIF: rapportsDuJour.filter(r => r.statutJournee === 'PRODUCTIF').length,
          NORMAL: rapportsDuJour.filter(r => r.statutJournee === 'NORMAL').length,
          DIFFICILE: rapportsDuJour.filter(r => r.statutJournee === 'DIFFICILE').length,
          TELETRAVAIL: rapportsDuJour.filter(r => r.statutJournee === 'TELETRAVAIL').length,
          ABSENT: rapportsDuJour.filter(r => r.statutJournee === 'ABSENT').length
        }
      };

      console.log('GET /dashboard - Stats Admin:', stats);

      const result = {
        date: todayStr,
        stats,
        employes: dashboard
      };
      
      console.log('GET /dashboard - Retour final pour admin:', {
        role: req.user.role,
        employesCount: result.employes.length,
        statsComplete: !!result.stats.totalEmployes
      });

      return res.status(200).json(result);

    } else {
      // Pour les utilisateurs normaux: seulement leurs propres données
      const userInfo = await Utilisateur.findById(req.user.id).select('nom prenom role');
      
      if (!userInfo) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Récupérer le rapport de l'utilisateur pour aujourd'hui
      const userRapport = await RapportQuotidien.findOne({
        agentId: req.user.id,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      console.log('GET /dashboard - Rapport utilisateur trouvé:', !!userRapport);

      const employeData = {
        employe: {
          id: userInfo._id,
          nom: userInfo.nom,
          prenom: userInfo.prenom,
          role: userInfo.role
        },
        rapport: userRapport ? {
          id: userRapport._id,
          activites: userRapport.activites?.substring(0, 100),
          statutJournee: userRapport.statutJournee,
          dateCreation: userRapport.dateCreation,
          metriques: getRoleMetrics(userRapport, userInfo.role)
        } : null,
        statut: userRapport ? 'RENDU' : 'EN_ATTENTE'
      };

      const stats = {
        totalEmployes: 1,
        rapportsRendus: userRapport ? 1 : 0,
        tauxCompletion: userRapport ? 100 : 0,
        parStatut: {
          PRODUCTIF: userRapport?.statutJournee === 'PRODUCTIF' ? 1 : 0,
          NORMAL: userRapport?.statutJournee === 'NORMAL' ? 1 : 0,
          DIFFICILE: userRapport?.statutJournee === 'DIFFICILE' ? 1 : 0,
          TELETRAVAIL: userRapport?.statutJournee === 'TELETRAVAIL' ? 1 : 0,
          ABSENT: userRapport?.statutJournee === 'ABSENT' ? 1 : 0
        }
      };

      console.log('GET /dashboard - Stats User:', stats);
      console.log('GET /dashboard - User Data:', employeData);

      return res.status(200).json({
        date: todayStr,
        stats,
        employes: [employeData] // Array d'un seul élément pour compatibilité
      });
    }

  } catch (err) { 
    console.error('Erreur dashboard rapports:', err);
    return res.status(500).json({ message: 'Erreur serveur', details: err.message }); 
  }
});

// Fonction helper pour extraire les métriques selon le rôle
function getRoleMetrics(rapport, role) {
  switch (role) {
    case 'commercial':
      return {
        appels: rapport.appelsClients,
        inscriptions: rapport.inscriptionsCreees,
        paiements: rapport.paiementsEncaisses
      };
    case 'social':
      return {
        publications: rapport.publications,
        vues: rapport.vues,
        engagement: rapport.likes + rapport.commentaires + rapport.partages
      };
    case 'administrateur':
      return {
        articles: rapport.articlesPub,
        packages: rapport.packagesMAJ,
        bugs: rapport.bugsCorriges
      };
    default:
      return {};
  }
}

/**
 * GET /api/rapports
 * Tous les rapports (secrétaire/DG/informatique) ou les siens
 */
router.get('/', async (req, res) => {
  try {
    const rolesAdmin = ['secretaire', 'dg', 'administrateur'];
    const filter = {};

    if (req.user.role === 'secretaire') {
      // Le secrétaire voit TOUS les rapports y compris ceux du DG
      // Pas de filtre nécessaire comme pour le DG
    } else if (req.user.role === 'dg') {
      // Le DG voit tous les rapports
      // Pas de filtre nécessaire
    } else if (req.user.role === 'administrateur') {
      // L'administrateur voit tous les rapports sauf ceux du DG
      const dgUsers = await Utilisateur.find({ role: 'dg' }).select('_id');
      const dgIds = dgUsers.map(u => u._id);
      filter.agentId = { $nin: dgIds };
    } else {
      // Les autres utilisateurs voient seulement leurs propres rapports
      filter.agentId = req.user.id;
    }
    
    if (req.query.agentId) filter.agentId = req.query.agentId;
    if (req.query.date) {
      const d = new Date(req.query.date);
      filter.date = {
        $gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        $lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
      };
    }

    const rapports = await RapportQuotidien.find(filter)
      .populate('agentId', 'nom prenom role')
      .sort({ date: -1 })
      .limit(50);

    return res.status(200).json({ count: rapports.length, rapports });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

/**
 * POST /api/rapports - Créer ou mettre à jour un rapport (UPSERT)
 */
router.post('/',
  [
    body('activites').trim().notEmpty().withMessage('Les activités sont requises'),
    body('date').optional().isISO8601().withMessage('Date invalide'),
    body('statutJournee').optional().isIn(['PRODUCTIF', 'NORMAL', 'DIFFICILE', 'TELETRAVAIL', 'ABSENT']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      // Normaliser la date - utiliser la date fournie ou aujourd'hui
      const inputDate = req.body.date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const dateRapport = new Date(inputDate + 'T00:00:00.000Z'); // Date UTC à minuit
      
      console.log('POST /api/rapports - Date input:', inputDate);
      console.log('POST /api/rapports - Date rapport:', dateRapport);

      // Créer les bornes du jour en UTC
      const startOfDay = new Date(dateRapport);
      startOfDay.setUTCHours(0, 0, 0, 0);
      
      const endOfDay = new Date(dateRapport);
      endOfDay.setUTCHours(23, 59, 59, 999);

      console.log('POST /api/rapports - Recherche entre:', startOfDay, 'et', endOfDay);

      // Vérifier d'abord si un document existe
      const existingDoc = await RapportQuotidien.findOne({
        agentId: req.user.id,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      const isCreation = !existingDoc;
      console.log('POST /api/rapports - Document existant:', !!existingDoc, isCreation ? 'CRÉATION' : 'MISE À JOUR');

      let rapport;

      if (isCreation) {
        // CRÉATION : Nouveau document avec tous les champs
        const newRapportData = {
          ...req.body,
          agentId: req.user.id,
          date: dateRapport,
          dateCreation: new Date(),
          dateModification: new Date(),
          version: 1
        };

        // Nettoyer les champs problématiques
        delete newRapportData._id;
        delete newRapportData.__v;
        
        console.log('POST /api/rapports - Création avec champs:', Object.keys(newRapportData));
        
        rapport = new RapportQuotidien(newRapportData);
        rapport = await rapport.save();
        
      } else {
        // MISE À JOUR : Seulement les champs modifiables
        const updateData = {
          ...req.body,
          dateModification: new Date()
        };

        // Supprimer tous les champs qui ne doivent pas être modifiés
        delete updateData.date;
        delete updateData.version;
        delete updateData.dateCreation;
        delete updateData._id;
        delete updateData.__v;
        delete updateData.agentId;
        
        console.log('POST /api/rapports - Mise à jour avec champs:', Object.keys(updateData));

        rapport = await RapportQuotidien.findByIdAndUpdate(
          existingDoc._id,
          { 
            $set: updateData,
            $inc: { version: 1 }
          },
          { returnDocument: 'after' }
        );
      }

      console.log('POST /api/rapports - Rapport traité:', rapport._id, isCreation ? 'CRÉÉ' : 'MIS À JOUR');

      return res.status(isCreation ? 201 : 200).json({ 
        message: isCreation ? 'Rapport créé avec succès' : 'Rapport mis à jour avec succès', 
        rapport,
        action: isCreation ? 'CREATE' : 'UPDATE'
      });

    } catch (err) { 
      console.error('Erreur lors de l\'upsert du rapport:', err);
      if (err.code === 11000) {
        return res.status(409).json({ message: 'Un rapport existe déjà pour cette date' });
      }
      return res.status(500).json({ message: 'Erreur serveur', details: err.message }); 
    }
  }
);

/**
 * PATCH /api/rapports/:id
 * Modifiable dans les 7 jours
 */
router.patch('/:id', async (req, res) => {
  try {
    const rapport = await RapportQuotidien.findById(req.params.id);
    if (!rapport) return res.status(404).json({ message: 'Rapport non trouvé' });

    // Vérifier que c'est le bon agent
    if (rapport.agentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    // Vérifier les 7 jours
    const diff = (new Date() - new Date(rapport.dateCreation)) / (1000 * 60 * 60 * 24);
    if (diff > 7) {
      return res.status(400).json({ message: 'Rapport non modifiable après 7 jours' });
    }

    // Champs autorisés pour modification (étendu pour le nouveau modèle)
    const allowed = [
      // Champs communs
      'activites', 'problemes', 'objectifsDemain', 'notes', 'statutJournee',
      // Commercial
      'appelsClients', 'inscriptionsCreees', 'paiementsEncaisses', 'suiviCommercial', 'constats', 'appelsDetail',
      // Social
      'plateformes', 'publications', 'vues', 'abonnesGagnes', 'likes', 'commentaires', 'partages',
      'campagnesActives', 'budgetCampagne', 'tauxEngagement',
      // Informatique
      'articlesPub', 'packagesMAJ', 'bugsCorriges', 'etatSite', 'problemesRegles', 'backupEffectue', 'maintenancePreventive',
      // DG/Direction
      'alertes', 'commentairesDirection'
    ];

    // Appliquer uniquement les champs autorisés
    allowed.forEach(k => { 
      if (req.body[k] !== undefined) {
        rapport[k] = req.body[k]; 
      }
    });

    // Mise à jour des métadonnées
    rapport.dateModification = new Date();
    if (!rapport.version) rapport.version = 1;
    rapport.version += 1;

    await rapport.save();
    return res.status(200).json({ message: 'Rapport mis à jour', rapport });
  } catch (err) { 
    console.error('Erreur PATCH rapport:', err);
    return res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' }); 
  }
});

module.exports = router;

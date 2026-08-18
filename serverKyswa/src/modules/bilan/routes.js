/**
 * @fileoverview Routes — Module bilan départs
 * Synthèse financière par départ (Prisma/PostgreSQL)
 */
const express = require('express');
const prisma = require('../../database/client');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

function createBilanRoutes(dependencies) {
  const router = express.Router();

  // Toutes les routes nécessitent une authentification
  router.use(protect);

  /**
   * GET /api/bilan
   * Vue synthétique financière par départ
   */
  router.get('/', checkPermission('bilan', 'view'), async (req, res, next) => {
    try {
      const departs = await prisma.departs.findMany({
        where: { actif: true },
        orderBy: { date_depart: 'desc' },
        include: {
          inscriptions: {
            where: {
              statut_client: { notIn: ['Désisté', 'Annulé'] }
            },
            include: {
              paiements: { select: { montant: true } }
            }
          }
        }
      });

      const bilans = departs.map(depart => {
        const inscriptions = depart.inscriptions || [];
        const nbInscrits = inscriptions.length;

        const totalDu = inscriptions.reduce((s, i) => s + Number(i.prix_total || 0), 0);
        const totalEncaisse = inscriptions.reduce((s, i) => {
          const paye = (i.paiements || []).reduce((sp, p) => sp + Number(p.montant || 0), 0);
          return s + paye;
        }, 0);
        const resteTotal = totalDu - totalEncaisse;
        const tauxRemplissage = depart.places_total > 0
          ? Math.round((nbInscrits / depart.places_total) * 100)
          : 0;

        // Répartition par statut paiement
        const parStatutPaiement = {};
        inscriptions.forEach(i => {
          const s = i.statut_paiement || 'Inconnu';
          parStatutPaiement[s] = (parStatutPaiement[s] || 0) + 1;
        });

        return {
          depart: {
            id: depart.id,
            nom_depart: depart.nom_depart,
            service: depart.service,
            date_depart: depart.date_depart,
            date_retour: depart.date_retour,
            places_total: depart.places_total,
            places_restantes: depart.places_restantes,
          },
          nbInscrits,
          places_total: depart.places_total,
          tauxRemplissage,
          totalDu,
          totalEncaisse,
          resteTotal,
          parStatutPaiement,
        };
      });

      return res.status(200).json({ success: true, data: bilans, bilans });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/bilan/:departId
   * Détail financier d'un départ spécifique
   */
  router.get('/:departId', checkPermission('bilan', 'view'), async (req, res, next) => {
    try {
      const depart = await prisma.departs.findUnique({
        where: { id: req.params.departId },
        include: {
          inscriptions: {
            include: {
              clients: { select: { nom: true, prenom: true, telephone: true, n_passeport: true } },
              paiements: { select: { montant: true, mode_paiement: true, date_paiement: true } },
            }
          }
        }
      });

      if (!depart) {
        return res.status(404).json({ success: false, message: 'Départ non trouvé' });
      }

      const bilan = depart.inscriptions.map(i => {
        const totalPaye = (i.paiements || []).reduce((s, p) => s + Number(p.montant || 0), 0);
        return {
          id: i.id,
          numero: i.numero,
          client: i.clients,
          statut_client: i.statut_client,
          statut_paiement: i.statut_paiement,
          type_chambre: i.type_chambre,
          formule: i.formule,
          prix_total: Number(i.prix_total || 0),
          totalPaye,
          resteAPayer: Math.max(0, Number(i.prix_total || 0) - totalPaye),
        };
      });

      return res.status(200).json({ success: true, data: { depart, bilan } });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/bilan/personnalises — Bilans manuels (table bilan_departs)
   */
  router.get('/personnalises', checkPermission('bilan', 'view'), async (req, res, next) => {
    try {
      const bilans = await prisma.bilan_departs.findMany({
        orderBy: { created_at: 'desc' },
        include: {
          profiles: { select: { nom: true, prenom: true, role: true } }
        }
      });
      return res.status(200).json({ success: true, data: bilans, bilans });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/bilan — Créer un bilan manuel
   */
  router.post('/', requireRole('comptable', 'administrateur', 'dg'), async (req, res, next) => {
    try {
      const bilan = await prisma.bilan_departs.create({
        data: {
          ...req.body,
          created_by: req.user.id,
        }
      });
      return res.status(201).json({ success: true, data: bilan, message: 'Bilan créé avec succès' });
    } catch (err) {
      next(err);
    }
  });

  /**
   * PATCH /api/bilan/:id — Modifier un bilan manuel
   */
  router.patch('/:id', requireRole('comptable', 'administrateur', 'dg'), async (req, res, next) => {
    try {
      const { id, created_by, created_at, ...data } = req.body;
      const bilan = await prisma.bilan_departs.update({
        where: { id: req.params.id },
        data: { ...data, updated_at: new Date() }
      });
      return res.status(200).json({ success: true, data: bilan, message: 'Bilan modifié avec succès' });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /api/bilan/:id — Supprimer un bilan manuel
   */
  router.delete('/:id', requireRole('comptable', 'administrateur', 'dg'), async (req, res, next) => {
    try {
      await prisma.bilan_departs.delete({ where: { id: req.params.id } });
      return res.status(200).json({ success: true, message: 'Bilan supprimé avec succès' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createBilanRoutes;

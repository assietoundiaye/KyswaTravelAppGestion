/**
 * @fileoverview Routes — Module comptabilité
 */
const express = require('express');
const prismaClient = require('../../database/client');
const { protect, requireRole } = require('../../core/middleware/auth');

function createComptabiliteRoutes() {
  const router = express.Router();

  /**
   * Helper pour calculer la plage de dates d'un mois (ex: "2026-08")
   */
  function getMonthRange(moisStr) {
    if (!moisStr || !/^\d{4}-\d{2}$/.test(moisStr)) return null;
    const [year, month] = moisStr.split('-').map(Number);
    const dateDebut = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const dateFin = new Date(year, month, 0, 23, 59, 59, 999);
    return { dateDebut, dateFin };
  }

  // ─────────────────────────────────────────────────────
  // GET /api/comptabilite/depenses
  // Liste des dépenses (optionnellement filtrées par mois)
  // ─────────────────────────────────────────────────────
  router.get('/depenses', protect, async (req, res, next) => {
    try {
      const { mois } = req.query;
      const range = getMonthRange(mois);

      const where = range ? {
        date_depense: {
          gte: range.dateDebut,
          lte: range.dateFin,
        }
      } : {};

      const depensesRaw = await prismaClient.depenses.findMany({
        where,
        orderBy: { date_depense: 'desc' },
      });

      const depenses = depensesRaw.map(d => ({
        id: d.id,
        _id: d.id,
        categorie: d.categorie,
        montant: d.montant,
        description: d.description || '',
        dateDepense: d.date_depense,
        date_depense: d.date_depense,
        mode_paiement: d.mode_paiement || 'Espèces',
        beneficiaire: d.beneficiaire || '',
        created_at: d.created_at,
      }));

      res.status(200).json({
        success: true,
        depenses,
        data: depenses,
        total: depenses.length,
      });
    } catch (e) {
      next(e);
    }
  });

  // ─────────────────────────────────────────────────────
  // GET /api/comptabilite/solde
  // Recettes, Dépenses, Bénéfice Net et Marge
  // ─────────────────────────────────────────────────────
  router.get('/solde', protect, async (req, res, next) => {
    try {
      const { mois } = req.query;
      const range = getMonthRange(mois);

      const depensesWhere = range ? { date_depense: { gte: range.dateDebut, lte: range.dateFin } } : {};
      const paiementsWhere = range ? { date_paiement: { gte: range.dateDebut, lte: range.dateFin } } : {};

      const [depensesAgg, paiementsAgg] = await Promise.all([
        prismaClient.depenses.aggregate({
          where: depensesWhere,
          _sum: { montant: true },
        }),
        prismaClient.paiements.aggregate({
          where: paiementsWhere,
          _sum: { montant: true },
        })
      ]);

      const totalDepenses = depensesAgg._sum.montant || 0;
      const totalEncaisse = Number(paiementsAgg._sum.montant || 0n);
      const beneficeNet = totalEncaisse - totalDepenses;

      let marge = 0;
      if (totalEncaisse > 0) {
        marge = Math.round((beneficeNet / totalEncaisse) * 100 * 10) / 10;
      }

      res.status(200).json({
        success: true,
        totalEncaisse,
        totalDepenses,
        beneficeNet,
        marge,
      });
    } catch (e) {
      next(e);
    }
  });

  router.get('/stats', protect, async (req, res, next) => {
    try {
      const [depensesAgg, paiementsAgg, nbDepenses, nbPaiements] = await Promise.all([
        prismaClient.depenses.aggregate({ _sum: { montant: true } }),
        prismaClient.paiements.aggregate({ _sum: { montant: true } }),
        prismaClient.depenses.count(),
        prismaClient.paiements.count()
      ]);

      const totalDepenses = depensesAgg._sum.montant || 0;
      const totalEncaisse = Number(paiementsAgg._sum.montant || 0n);
      const beneficeNet = totalEncaisse - totalDepenses;
      const marge = totalEncaisse > 0 ? Math.round((beneficeNet / totalEncaisse) * 100 * 10) / 10 : 0;

      res.status(200).json({
        success: true,
        totalEncaisse,
        totalDepenses,
        beneficeNet,
        marge,
        nbDepenses,
        nbPaiements
      });
    } catch (e) {
      next(e);
    }
  });

  // ─────────────────────────────────────────────────────
  // POST /api/comptabilite/depenses
  // Créer une nouvelle dépense
  // ─────────────────────────────────────────────────────
  router.post('/depenses', protect, async (req, res, next) => {
    try {
      const { categorie, montant, description, dateDepense, date_depense, mode_paiement, beneficiaire } = req.body;

      const dateVal = dateDepense || date_depense;
      const date_depense_obj = dateVal ? new Date(dateVal) : new Date();

      const newDepense = await prismaClient.depenses.create({
        data: {
          categorie: categorie || 'AUTRE',
          montant: parseInt(montant || 0, 10),
          description: description || '',
          date_depense: date_depense_obj,
          mode_paiement: mode_paiement || 'Espèces',
          beneficiaire: beneficiaire || null,
          saisie_par: req.user?.id || null,
        }
      });

      const formatted = {
        id: newDepense.id,
        _id: newDepense.id,
        categorie: newDepense.categorie,
        montant: newDepense.montant,
        description: newDepense.description,
        dateDepense: newDepense.date_depense,
        date_depense: newDepense.date_depense,
        mode_paiement: newDepense.mode_paiement,
      };

      res.status(201).json({
        success: true,
        data: formatted,
        depense: formatted,
        message: 'Dépense créée avec succès',
      });
    } catch (e) {
      next(e);
    }
  });

  // ─────────────────────────────────────────────────────
  // DELETE /api/comptabilite/depenses/:id
  // Supprimer une dépense
  // ─────────────────────────────────────────────────────
  router.delete('/depenses/:id', protect, async (req, res, next) => {
    try {
      await prismaClient.depenses.delete({
        where: { id: req.params.id }
      });
      res.status(200).json({
        success: true,
        message: 'Dépense supprimée avec succès',
      });
    } catch (e) {
      next(e);
    }
  });

  // ─────────────────────────────────────────────────────
  // Fallbacks génériques
  // ─────────────────────────────────────────────────────
  router.get('/', protect, async (req, res, next) => {
    try {
      const depensesRaw = await prismaClient.depenses.findMany({
        orderBy: { date_depense: 'desc' }
      });
      const data = depensesRaw.map(d => ({ ...d, _id: d.id, dateDepense: d.date_depense }));
      res.json({ success: true, data, depenses: data });
    } catch (e) { next(e); }
  });

  router.post('/', protect, async (req, res, next) => {
    try {
      const { categorie, montant, description, dateDepense, date_depense } = req.body;
      const dateVal = dateDepense || date_depense;
      const item = await prismaClient.depenses.create({
        data: {
          categorie: categorie || 'AUTRE',
          montant: parseInt(montant || 0, 10),
          description: description || '',
          date_depense: dateVal ? new Date(dateVal) : new Date(),
          saisie_par: req.user?.id || null,
        }
      });
      res.status(201).json({ success: true, data: { ...item, _id: item.id } });
    } catch (e) { next(e); }
  });

  router.delete('/:id', protect, async (req, res, next) => {
    try {
      await prismaClient.depenses.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Supprimé avec succès' });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = createComptabiliteRoutes;

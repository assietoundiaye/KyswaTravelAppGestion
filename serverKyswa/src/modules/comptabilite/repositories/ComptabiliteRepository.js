/**
 * @fileoverview ComptabiliteRepository — Tables `depenses` + `paiements` (Supabase)
 *
 * Ce repository agrège les dépenses ET les recettes (paiements) pour
 * produire des rapports financiers complets (bilan, P&L, trésorerie).
 *
 * Structure `depenses` :
 *   id, date_depense (Date), categorie, description, montant (Int),
 *   mode_paiement, beneficiaire, depart_id, justificatif_url,
 *   saisie_par (profiles.id), agent_id (auth.users.id), created_at
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class ComptabiliteRepository extends BaseRepository {
  constructor() {
    // Délégué principal : depenses
    super(prismaClient.depenses);
    // Délégué secondaire : paiements (recettes)
    this.paiementsModel = prismaClient.paiements;
  }

  // ─────────────────────────────────────────────────────
  // DÉPENSES
  // ─────────────────────────────────────────────────────

  async findDepensesByDepart(depart_id, options = {}) {
    return await this.findMany({ depart_id }, options);
  }

  async findDepensesByCategorie(categorie, options = {}) {
    return await this.findMany({ categorie }, options);
  }

  async findDepensesByPeriode(dateDebut, dateFin, options = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;
    const where = {
      date_depense: { gte: new Date(dateDebut), lte: new Date(dateFin) }
    };
    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip, take: limit,
        include: {
          profiles: { select: { id: true, nom: true, prenom: true } },
          departs:  { select: { id: true, nom_depart: true } }
        },
        orderBy: { date_depense: 'desc' }
      }),
      this.model.count({ where })
    ]);
    return { data, total };
  }

  async findDepensesWithDetails(options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.findMany({
        skip, take: limit,
        include: {
          profiles: { select: { id: true, nom: true, prenom: true } },
          departs:  { select: { id: true, nom_depart: true } }
        },
        orderBy: { date_depense: 'desc' }
      }),
      this.model.count()
    ]);
    return { data, total };
  }

  // ─────────────────────────────────────────────────────
  // AGRÉGATS FINANCIERS
  // ─────────────────────────────────────────────────────

  async getTotalDepensesParDepart(depart_id) {
    const result = await this.model.aggregate({
      where: { depart_id },
      _sum: { montant: true }
    });
    return result._sum.montant || 0;
  }

  async getTotalDepensesParPeriode(dateDebut, dateFin) {
    const result = await this.model.aggregate({
      where: { date_depense: { gte: new Date(dateDebut), lte: new Date(dateFin) } },
      _sum: { montant: true },
      _count: { _all: true }
    });
    return { total: result._sum.montant || 0, count: result._count._all };
  }

  async getTotalRecettesParPeriode(dateDebut, dateFin) {
    const result = await this.paiementsModel.aggregate({
      where: { date_paiement: { gte: new Date(dateDebut), lte: new Date(dateFin) } },
      _sum: { montant: true },
      _count: { _all: true }
    });
    return { total: result._sum.montant || 0n, count: result._count._all };
  }

  async getDepensesParCategorie(dateDebut, dateFin) {
    const where = dateDebut && dateFin
      ? { date_depense: { gte: new Date(dateDebut), lte: new Date(dateFin) } }
      : {};
    const groups = await this.model.groupBy({
      by: ['categorie'],
      where,
      _sum: { montant: true },
      _count: { _all: true },
      orderBy: { _sum: { montant: 'desc' } }
    });
    return groups.map(g => ({
      categorie: g.categorie,
      total: g._sum.montant || 0,
      count: g._count._all
    }));
  }

  async getDepensesParMode(dateDebut, dateFin) {
    const where = dateDebut && dateFin
      ? { date_depense: { gte: new Date(dateDebut), lte: new Date(dateFin) } }
      : {};
    const groups = await this.model.groupBy({
      by: ['mode_paiement'],
      where,
      _sum: { montant: true },
      _count: { _all: true }
    });
    return groups.map(g => ({
      mode: g.mode_paiement,
      total: g._sum.montant || 0,
      count: g._count._all
    }));
  }

  /**
   * Bilan financier mensuel (recettes vs dépenses)
   */
  async getBilanMensuel(annee) {
    const debut = new Date(`${annee}-01-01`);
    const fin   = new Date(`${annee}-12-31`);

    const [depenses, recettes] = await Promise.all([
      this.model.findMany({
        where: { date_depense: { gte: debut, lte: fin } },
        select: { montant: true, date_depense: true }
      }),
      this.paiementsModel.findMany({
        where: { date_paiement: { gte: debut, lte: fin } },
        select: { montant: true, date_paiement: true }
      })
    ]);

    const bilan = Array.from({ length: 12 }, (_, i) => ({
      mois: i + 1,
      recettes: 0,
      depenses: 0,
      solde: 0
    }));

    for (const d of depenses) {
      if (d.date_depense) {
        const m = new Date(d.date_depense).getMonth();
        bilan[m].depenses += d.montant || 0;
      }
    }
    for (const r of recettes) {
      if (r.date_paiement) {
        const m = new Date(r.date_paiement).getMonth();
        bilan[m].recettes += Number(r.montant) || 0;
      }
    }
    for (const b of bilan) {
      b.solde = b.recettes - b.depenses;
    }

    return bilan;
  }

  /**
   * Bilan complet d'un départ
   */
  async getBilanDepart(depart_id) {
    const [depenses, recettes] = await Promise.all([
      this.model.aggregate({
        where: { depart_id },
        _sum: { montant: true },
        _count: { _all: true }
      }),
      this.paiementsModel.aggregate({
        where: { inscriptions: { depart_id } },
        _sum: { montant: true },
        _count: { _all: true }
      })
    ]);

    const totalRecettes = Number(recettes._sum.montant || 0);
    const totalDepenses = depenses._sum.montant || 0;

    return {
      depart_id,
      recettes:   { total: totalRecettes, count: recettes._count._all },
      depenses:   { total: totalDepenses, count: depenses._count._all },
      benefice:   totalRecettes - totalDepenses
    };
  }

  async getDepensesDuMois() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const result = await this.model.aggregate({
      where: { date_depense: { gte: start } },
      _sum: { montant: true },
      _count: { _all: true }
    });
    return { total: result._sum.montant || 0, count: result._count._all };
  }
}

module.exports = ComptabiliteRepository;

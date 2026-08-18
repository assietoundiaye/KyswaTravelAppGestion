/**
 * @fileoverview PaiementRepository — Table `paiements` (Supabase)
 *
 * Structure de la table `paiements` :
 *   id, inscription_id, montant (BigInt), mode_paiement, date_paiement,
 *   recu_numero, notes, enregistre_par (profile.id), created_at
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class PaiementRepository extends BaseRepository {
  constructor() {
    super(prismaClient.paiements);
    this.defaultInclude = {
      inscriptions: {
        include: {
          clients: true,
          departs: true,
        }
      }
    };
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE MÉTIER
  // ─────────────────────────────────────────────────────

  async findByInscription(inscription_id) {
    return await this.model.findMany({
      where: { inscription_id },
      orderBy: { date_paiement: 'desc' }
    });
  }

  async findByAgent(enregistre_par, options = {}) {
    return await this.findMany({ enregistre_par }, options);
  }

  async findByMode(mode_paiement, options = {}) {
    return await this.findMany({ mode_paiement }, options);
  }

  async findByRecuNumero(recu_numero) {
    return await this.findOne({ recu_numero });
  }

  async findByPeriode(dateDebut, dateFin, options = {}) {
    return await this.findMany(
      {
        date_paiement: {
          $gte: new Date(dateDebut),
          $lte: new Date(dateFin)
        }
      },
      options
    );
  }

  // ─────────────────────────────────────────────────────
  // AVEC RELATIONS
  // ─────────────────────────────────────────────────────

  async findWithInscription(id) {
    return await this.model.findUnique({
      where: { id },
      include: {
        inscriptions: {
          include: {
            clients: { select: { id: true, nom: true, prenom: true, telephone: true } }
          }
        },
        profiles: { select: { id: true, nom: true, prenom: true } }
      }
    });
  }

  async findByInscriptionWithDetails(inscription_id) {
    return await this.model.findMany({
      where: { inscription_id },
      include: {
        profiles: { select: { id: true, nom: true, prenom: true } }
      },
      orderBy: { date_paiement: 'desc' }
    });
  }

  // ─────────────────────────────────────────────────────
  // STATISTIQUES FINANCIÈRES
  // ─────────────────────────────────────────────────────

  async getTotalByInscription(inscription_id) {
    const result = await this.model.aggregate({
      where: { inscription_id },
      _sum: { montant: true }
    });
    return result._sum.montant || 0n;
  }

  async getTotalByPeriode(dateDebut, dateFin) {
    const result = await this.model.aggregate({
      where: {
        date_paiement: {
          gte: new Date(dateDebut),
          lte: new Date(dateFin)
        }
      },
      _sum: { montant: true },
      _count: { _all: true }
    });
    return {
      total: result._sum.montant || 0n,
      count: result._count._all
    };
  }

  async getTotalByMode() {
    const groups = await this.model.groupBy({
      by: ['mode_paiement'],
      _sum: { montant: true },
      _count: { _all: true }
    });
    return groups.map(g => ({
      mode: g.mode_paiement,
      total: g._sum.montant || 0n,
      count: g._count._all
    }));
  }

  async getTotalDuMois() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const result = await this.model.aggregate({
      where: { date_paiement: { gte: start } },
      _sum: { montant: true },
      _count: { _all: true }
    });
    return {
      total: result._sum.montant || 0n,
      count: result._count._all
    };
  }

  async getStatsMensuels(annee) {
    const debut = new Date(`${annee}-01-01`);
    const fin   = new Date(`${annee}-12-31`);
    const paiements = await this.model.findMany({
      where: { date_paiement: { gte: debut, lte: fin } },
      select: { montant: true, date_paiement: true }
    });

    const parMois = Array(12).fill(null).map((_, i) => ({
      mois: i + 1,
      total: 0n,
      count: 0
    }));

    for (const p of paiements) {
      if (p.date_paiement) {
        const mois = new Date(p.date_paiement).getMonth();
        parMois[mois].total += BigInt(p.montant);
        parMois[mois].count += 1;
      }
    }

    return parMois;
  }
}

module.exports = PaiementRepository;

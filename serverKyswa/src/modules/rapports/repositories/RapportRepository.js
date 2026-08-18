/**
 * @fileoverview RapportRepository — Tables `rapports_quotidiens` + `rapports` + `bilan_departs` (Supabase)
 *
 * Structure `rapports_quotidiens` :
 *   id, date_rapport, resume, inscriptions_du_jour, paiements_du_jour (BigInt),
 *   desistements, visas_envoyes, billets_emis, points_attention,
 *   alerte_dg, statut_journee, rdv_du_jour, taches_du_jour,
 *   cree_par (profiles.id), created_at
 *
 * Structure `rapports` :
 *   id, type, titre, contenu (JSON), periode_debut, periode_fin,
 *   genere_par (profiles.id), created_at
 *
 * Structure `bilan_departs` :
 *   id, depart_id, cree_par (profiles.id), created_at, ...
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class RapportRepository extends BaseRepository {
  constructor() {
    // Délégué principal : rapports_quotidiens
    super(prismaClient.rapports_quotidiens);
    this.defaultInclude = {
      profiles_rapports_quotidiens_user_idToprofiles: { select: { id: true, nom: true, prenom: true } },
      profiles_rapports_quotidiens_agent_idToprofiles: { select: { id: true, nom: true, prenom: true } }
    };
    this.rapportsModel  = prismaClient.rapports;
    this.bilanModel     = prismaClient.bilan_departs;
  }

  // ─────────────────────────────────────────────────────
  // RAPPORTS QUOTIDIENS
  // ─────────────────────────────────────────────────────

  async findByDate(date) {
    return await this.model.findFirst({
      where: { date_rapport: new Date(date) },
      orderBy: { created_at: 'desc' }
    });
  }

  async findByPeriode(dateDebut, dateFin, options = {}) {
    const { page = 1, limit = 30 } = options;
    const skip = (page - 1) * limit;
    const where = {
      date_rapport: { gte: new Date(dateDebut), lte: new Date(dateFin) }
    };
    const [data, total] = await Promise.all([
      this.model.findMany({
        where, skip, take: limit,
        include: {
          profiles_rapports_quotidiens_user_idToprofiles: { select: { id: true, nom: true, prenom: true } }
        },
        orderBy: { date_rapport: 'desc' }
      }),
      this.model.count({ where })
    ]);
    return { data, total };
  }

  async findDerniers(limit = 7) {
    return await this.model.findMany({
      take: limit,
      include: {
        profiles_rapports_quotidiens_user_idToprofiles: { select: { id: true, nom: true, prenom: true } }
      },
      orderBy: { date_rapport: 'desc' }
    });
  }

  async findAlertesActivees() {
    return await this.model.findMany({
      where: { alerte_dg: { in: ['Oui', 'true', '1'] } },
      orderBy: { date_rapport: 'desc' }
    });
  }

  async findByCreateur(cree_par, options = {}) {
    return await this.findMany({ cree_par }, options);
  }

  async updateStatutJournee(id, statut_journee) {
    return await this.updateById(id, { statut_journee });
  }

  async setAlerteDG(id, alerte_dg) {
    return await this.updateById(id, { alerte_dg });
  }

  // ─────────────────────────────────────────────────────
  // RAPPORTS GÉNÉRAUX (type: mensuel, annuel, etc.)
  // ─────────────────────────────────────────────────────

  async findRapportsByType(type, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where = { type };
    const [data, total] = await Promise.all([
      this.rapportsModel.findMany({
        where, skip, take: limit,
        include: { profiles: { select: { id: true, nom: true, prenom: true } } },
        orderBy: { created_at: 'desc' }
      }),
      this.rapportsModel.count({ where })
    ]);
    return { data, total };
  }

  async createRapport(data) {
    return await this.rapportsModel.create({ data });
  }

  async findRapportById(id) {
    return await this.rapportsModel.findUnique({
      where: { id },
      include: { profiles: { select: { id: true, nom: true, prenom: true } } }
    });
  }

  // ─────────────────────────────────────────────────────
  // BILANS DE DÉPART
  // ─────────────────────────────────────────────────────

  async findBilanByDepart(depart_id) {
    return await this.bilanModel.findMany({
      where: { depart_id },
      include: {
        profiles: { select: { id: true, nom: true, prenom: true } },
        departs:  { select: { id: true, nom_depart: true, date_depart: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async createBilan(data) {
    return await this.bilanModel.create({ data });
  }

  // ─────────────────────────────────────────────────────
  // TABLEAU DE BORD — RÉSUMÉ GLOBAL
  // ─────────────────────────────────────────────────────

  async getDashboardSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      rapportAujourdhui,
      totalRapports,
      alertesActives
    ] = await Promise.all([
      this.model.findFirst({
        where: { date_rapport: { gte: today } },
        orderBy: { created_at: 'desc' }
      }),
      this.model.count(),
      this.model.count({ where: { alerte_dg: { in: ['Oui', 'true', '1'] } } })
    ]);

    return { rapportAujourdhui, totalRapports, alertesActives };
  }
}

module.exports = RapportRepository;

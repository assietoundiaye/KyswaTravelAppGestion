/**
 * @fileoverview ReservationRepository — Table `inscriptions` (Supabase)
 *
 * Correspond à l'ancienne collection MongoDB "Reservation".
 * Dans Supabase, les réservations de pèlerins s'appellent "inscriptions".
 *
 * Structure de la table `inscriptions` :
 *   id, numero, client_id, service, depart_id, formule, type_chambre,
 *   hotel_makkah, hotel_medine, nb_nuits_makkah, nb_nuits_medine,
 *   prix_total, acompte, statut_paiement, statut_client, agent_id,
 *   notes, created_at, date_inscription, date_dernier_depot
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class ReservationRepository extends BaseRepository {
  constructor() {
    super(prismaClient.inscriptions);
    this.defaultInclude = {
      clients: true,
      departs: true,
      paiements: true,
    };
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE MÉTIER
  // ─────────────────────────────────────────────────────

  async findByNumero(numero) {
    return await this.findOne({ numero });
  }

  async findByClient(client_id, options = {}) {
    return await this.findMany({ client_id }, options);
  }

  async findByDepart(depart_id, options = {}) {
    return await this.findMany({ depart_id }, options);
  }

  async findByService(service, options = {}) {
    return await this.findMany({ service }, options);
  }

  async findByAgent(agent_id, options = {}) {
    return await this.findMany({ agent_id }, options);
  }

  async findByStatutPaiement(statut_paiement, options = {}) {
    return await this.findMany({ statut_paiement }, options);
  }

  async findByStatutClient(statut_client, options = {}) {
    return await this.findMany({ statut_client }, options);
  }

  // ─────────────────────────────────────────────────────
  // REQUÊTES AVEC RELATIONS
  // ─────────────────────────────────────────────────────

  /**
   * Inscription complète avec client, départ, paiements, visa
   */
  async findWithDetails(id) {
    return await this.model.findUnique({
      where: { id },
      include: {
        clients:          true,
        departs:          true,
        paiements:        { orderBy: { date_paiement: 'desc' } },
        visas:            true,
        desistements:     true,
        billets_pelerins: true,
        recouvrement:     true,
        profiles:         { select: { id: true, nom: true, prenom: true, role: true } },
      }
    });
  }

  /**
   * Liste des inscriptions d'un départ avec toutes les infos client
   */
  async findByDepartWithClients(depart_id) {
    return await this.model.findMany({
      where: { depart_id },
      include: {
        clients: {
          select: { id: true, nom: true, prenom: true, telephone: true, email: true, n_passeport: true }
        },
        paiements: true,
        visas:     true,
      },
      orderBy: { date_inscription: 'asc' }
    });
  }

  /**
   * Inscriptions en attente de paiement
   */
  async findImpayees(options = {}) {
    return await this.findMany(
      { statut_paiement: { not: 'Soldé' } },
      options
    );
  }

  // ─────────────────────────────────────────────────────
  // MISES À JOUR MÉTIER
  // ─────────────────────────────────────────────────────

  async updateStatutPaiement(id, statut_paiement, date_dernier_depot = null) {
    const data = { statut_paiement };
    if (date_dernier_depot) data.date_dernier_depot = new Date(date_dernier_depot);
    return await this.updateById(id, data);
  }

  async updateStatutClient(id, statut_client) {
    return await this.updateById(id, { statut_client });
  }

  // ─────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────

  async getStatsByService() {
    const groups = await this.model.groupBy({
      by: ['service'],
      _count: { _all: true },
      _sum: { prix_total: true }
    });
    return groups.map(g => ({
      service: g.service,
      count: g._count._all,
      chiffre_affaires: g._sum.prix_total
    }));
  }

  async getStatsByStatutPaiement() {
    const groups = await this.model.groupBy({
      by: ['statut_paiement'],
      _count: { _all: true },
      _sum: { prix_total: true, acompte: true }
    });
    return groups.map(g => ({
      statut: g.statut_paiement,
      count: g._count._all,
      total: g._sum.prix_total,
      percu: g._sum.acompte
    }));
  }

  async getStatsByDepart(depart_id) {
    const [count, totalCA, totalPercu] = await Promise.all([
      this.model.count({ where: { depart_id } }),
      this.model.aggregate({
        where: { depart_id },
        _sum: { prix_total: true }
      }),
      this.model.aggregate({
        where: { depart_id },
        _sum: { acompte: true }
      }),
    ]);
    return {
      count,
      chiffre_affaires: totalCA._sum.prix_total || 0,
      acompte_total: totalPercu._sum.acompte || 0
    };
  }

  async getThisMonthCount() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return await this.model.count({ where: { created_at: { gte: start } } });
  }
}

module.exports = ReservationRepository;

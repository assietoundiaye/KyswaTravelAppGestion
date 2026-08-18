/**
 * @fileoverview DesistementRepository — Table `desistements` (Supabase)
 *
 * Structure de la table `desistements` :
 *   id, inscription_id, client_id, date_annulation,
 *   motif, total_paye (BigInt), jours_avant_depart,
 *   pct_remboursement (Decimal), montant_rembourser (BigInt),
 *   montant_retenu (BigInt), date_remboursement, remb_via,
 *   statut, prochain_voyage, notes, agent_id, created_at
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class DesistementRepository extends BaseRepository {
  constructor() {
    super(prismaClient.desistements);
    this.defaultInclude = {
      clients: true,
      inscriptions: true,
    };
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE MÉTIER
  // ─────────────────────────────────────────────────────

  async findByClient(client_id) {
    return await this.model.findMany({
      where: { client_id },
      orderBy: { date_annulation: 'desc' }
    });
  }

  async findByInscription(inscription_id) {
    return await this.model.findMany({
      where: { inscription_id },
      orderBy: { date_annulation: 'desc' }
    });
  }

  async findByStatut(statut, options = {}) {
    return await this.findMany({ statut }, options);
  }

  async findEnAttente(options = {}) {
    return await this.findMany({ statut: 'En attente' }, options);
  }

  async findRemboursesEnAttente() {
    return await this.model.findMany({
      where: {
        statut: 'Approuvé',
        date_remboursement: null
      },
      include: {
        clients:      { select: { id: true, nom: true, prenom: true, telephone: true } },
        inscriptions: { select: { id: true, numero: true, service: true } }
      },
      orderBy: { date_annulation: 'asc' }
    });
  }

  // ─────────────────────────────────────────────────────
  // AVEC RELATIONS
  // ─────────────────────────────────────────────────────

  async findWithDetails(id) {
    return await this.model.findUnique({
      where: { id },
      include: {
        clients:      true,
        inscriptions: { include: { departs: true } },
        profiles:     { select: { id: true, nom: true, prenom: true } }
      }
    });
  }

  async findAllWithDetails(options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        skip,
        take: limit,
        include: {
          clients:      { select: { id: true, nom: true, prenom: true, telephone: true } },
          inscriptions: { select: { id: true, numero: true, service: true } },
        },
        orderBy: { date_annulation: 'desc' }
      }),
      this.model.count()
    ]);

    return { data, total };
  }

  // ─────────────────────────────────────────────────────
  // MISES À JOUR MÉTIER
  // ─────────────────────────────────────────────────────

  async approuver(id, { pct_remboursement, montant_rembourser, montant_retenu }) {
    return await this.updateById(id, {
      statut:            'Approuvé',
      pct_remboursement,
      montant_rembourser,
      montant_retenu
    });
  }

  async marquerRembourse(id, { date_remboursement, remb_via }) {
    return await this.updateById(id, {
      statut:             'Remboursé',
      date_remboursement: date_remboursement ? new Date(date_remboursement) : new Date(),
      remb_via
    });
  }

  async refuser(id, notes) {
    return await this.updateById(id, { statut: 'Refusé', notes });
  }

  // ─────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────

  async getStats() {
    const [total, enAttente, approuves, rembourses] = await Promise.all([
      this.model.count(),
      this.model.count({ where: { statut: 'En attente' } }),
      this.model.count({ where: { statut: 'Approuvé' } }),
      this.model.count({ where: { statut: 'Remboursé' } }),
    ]);

    const montants = await this.model.aggregate({
      _sum: { montant_rembourser: true, montant_retenu: true }
    });

    return {
      total, enAttente, approuves, rembourses,
      totalARembourser: montants._sum.montant_rembourser || 0n,
      totalRetenu:      montants._sum.montant_retenu || 0n,
    };
  }
}

module.exports = DesistementRepository;

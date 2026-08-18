/**
 * @fileoverview RecouvrementRepository — Table `recouvrement` (Supabase)
 *
 * Correspond à l'ancienne collection MongoDB "Relance".
 * Gère le suivi des impayés et les actions de recouvrement.
 *
 * Structure de la table `recouvrement` :
 *   (introspect à partir du schéma Supabase — champs principaux)
 *   id, client_id, inscription_id, montant_du (BigInt), date_echeance,
 *   statut, notes, agent_id, created_at
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class RecouvrementRepository extends BaseRepository {
  constructor() {
    super(prismaClient.recouvrement);
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE MÉTIER
  // ─────────────────────────────────────────────────────

  async findByClient(client_id) {
    return await this.model.findMany({
      where: { client_id },
      include: {
        inscriptions: { select: { id: true, numero: true, service: true, prix_total: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async findByInscription(inscription_id) {
    return await this.model.findMany({
      where: { inscription_id },
      orderBy: { created_at: 'desc' }
    });
  }

  async findWithDetails(options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.findMany({
        skip, take: limit,
        include: {
          clients: {
            select: { id: true, nom: true, prenom: true, telephone: true, email: true }
          },
          inscriptions: {
            select: { id: true, numero: true, service: true, prix_total: true, acompte: true }
          },
          profiles: { select: { id: true, nom: true, prenom: true } }
        },
        orderBy: { created_at: 'desc' }
      }),
      this.model.count()
    ]);
    return { data, total };
  }

  // ─────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────

  async getStats() {
    const total = await this.model.count();
    return { total };
  }
}

module.exports = RecouvrementRepository;

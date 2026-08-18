/**
 * @fileoverview ClientRepository — Table `clients` (Supabase)
 *
 * Structure réelle de la table `clients` :
 *   id, nom, prenom, genre, telephone, email, adresse, ville,
 *   date_naissance, n_passeport, expiration_passeport, nationalite,
 *   vip, notes, created_by, created_at, profession, employeur, quartier,
 *   photo_url, nature_passeport, visa_schengen, visa_usa, autres_visas,
 *   premier_voyage, agence_precedente, nb_hajj, nb_oumra, contact_prefere,
 *   source_connaissance, referent, niveau_fidelite, budget_estime,
 *   passport_url, documents_urls, date_ajout
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class ClientRepository extends BaseRepository {
  constructor() {
    // Passe le vrai délégué Prisma de la table `clients`
    super(prismaClient.clients);
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE PAR IDENTIFIANTS
  // ─────────────────────────────────────────────────────

  async findByEmail(email) {
    return await this.findOne({ email });
  }

  async findByTelephone(telephone) {
    return await this.findOne({ telephone });
  }

  async findByPasseport(n_passeport) {
    return await this.findOne({ n_passeport });
  }

  // ─────────────────────────────────────────────────────
  // VÉRIFICATIONS D'EXISTENCE
  // ─────────────────────────────────────────────────────

  async emailExists(email) {
    return await this.exists({ email });
  }

  async telephoneExists(telephone) {
    return await this.exists({ telephone });
  }

  async passeportExists(n_passeport) {
    return await this.exists({ n_passeport });
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE AVANCÉE
  // ─────────────────────────────────────────────────────

  /**
   * Recherche textuelle multi-champs (nom, prénom, téléphone, email, passeport)
   */
  async searchClients(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { nom:          { contains: query, mode: 'insensitive' } },
        { prenom:       { contains: query, mode: 'insensitive' } },
        { email:        { contains: query, mode: 'insensitive' } },
        { telephone:    { contains: query, mode: 'insensitive' } },
        { n_passeport:  { contains: query, mode: 'insensitive' } },
      ]
    };

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      this.model.count({ where })
    ]);

    return { data, total };
  }

  /**
   * Clients par niveau de fidélité
   */
  async getByLoyaltyLevel(niveau_fidelite) {
    return await this.model.findMany({
      where: { niveau_fidelite },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Clients créés par un agent
   */
  async getByCreator(created_by) {
    return await this.model.findMany({
      where: { created_by },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Clients avec leurs inscriptions + détails du départ
   */
  async getClientWithInscriptions(clientId) {
    return await this.model.findUnique({
      where: { id: clientId },
      include: {
        inscriptions: {
          include: {
            departs: {
              select: {
                id: true,
                service: true,
                nom_depart: true,
                date_depart: true,
                date_retour: true,
              }
            },
            paiements: {
              select: {
                id: true,
                montant: true,
                date_paiement: true,
                mode_paiement: true,
              },
              orderBy: { date_paiement: 'desc' }
            }
          },
          orderBy: { created_at: 'desc' }
        },
        visas: true,
        desistements: true
      }
    });
  }

  // ─────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────

  /**
   * Compter les clients par niveau de fidélité
   */
  async getStatsByLoyalty() {
    const groups = await this.model.groupBy({
      by: ['niveau_fidelite'],
      _count: { _all: true }
    });
    return groups.map(g => ({
      niveau: g.niveau_fidelite,
      count: g._count._all
    }));
  }

  /**
   * Statistiques Hajj vs Omra
   */
  async getStatsByVoyageType() {
    const [totalHajj, totalOumra, vip] = await Promise.all([
      this.model.aggregate({ _sum: { nb_hajj: true }, where: { nb_hajj: { gt: 0 } } }),
      this.model.aggregate({ _sum: { nb_oumra: true }, where: { nb_oumra: { gt: 0 } } }),
      this.model.count({ where: { vip: true } })
    ]);
    return {
      totalHajj: totalHajj._sum.nb_hajj || 0,
      totalOumra: totalOumra._sum.nb_oumra || 0,
      vip
    };
  }

  /**
   * Nouveaux clients du mois en cours
   */
  async getNewClientsThisMonth() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    return await this.model.findMany({
      where: { created_at: { gte: start } },
      orderBy: { created_at: 'desc' }
    });
  }

  // ─────────────────────────────────────────────────────
  // MISES À JOUR
  // ─────────────────────────────────────────────────────

  async updateLoyaltyLevel(id, niveau_fidelite) {
    return await this.updateById(id, { niveau_fidelite });
  }

  async setVip(id, vip = true) {
    return await this.updateById(id, { vip });
  }

  async updatePhotoUrl(id, photo_url) {
    return await this.updateById(id, { photo_url });
  }

  async addDocumentUrl(clientId, url) {
    const client = await this.findById(clientId);
    if (!client) throw new Error('Client non trouvé');
    const docs = Array.isArray(client.documents_urls) ? client.documents_urls : [];
    docs.push(url);
    return await this.updateById(clientId, { documents_urls: docs });
  }
}

module.exports = ClientRepository;

/**
 * @fileoverview Repository pour les suppléments
 * Gère les opérations de base de données via Prisma
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class SupplementRepository extends BaseRepository {
  constructor() {
    super(prismaClient.supplements);
  }

  /**
   * Recherche avec filtres
   */
  async findManyWithFilters(filters = {}, options = {}) {
    const { page = 1, limit = 50, search = '' } = options;
    const skip = (page - 1) * limit;

    const where = {};

    // Filtre de recherche
    if (search?.trim()) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filtre actif
    if (filters.actif !== undefined) {
      where.actif = filters.actif;
    }

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        include: {
          profiles: {
            select: { nom: true, prenom: true }
          },
          lignes_supplements: {
            select: { id: true, quantite: true, prix_total: true }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      this.model.count({ where })
    ]);

    return {
      data: data.map(item => ({
        ...item,
        prix: parseFloat(item.prix),
        createdBy: item.profiles ? `${item.profiles.nom} ${item.profiles.prenom || ''}`.trim() : null,
        nombreUtilisations: item.lignes_supplements?.length || 0
      })),
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    };
  }

  /**
   * Recherche par nom
   */
  async findByName(nom) {
    return await this.model.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' } }
    });
  }

  /**
   * Suppléments actifs seulement
   */
  async findActiveSupplements() {
    const supplements = await this.model.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' },
      select: {
        id: true,
        nom: true,
        prix: true,
        description: true
      }
    });

    return supplements.map(item => ({
      ...item,
      prix: parseFloat(item.prix)
    }));
  }
}

module.exports = SupplementRepository;
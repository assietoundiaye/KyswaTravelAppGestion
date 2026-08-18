/**
 * Service Package PostgreSQL
 * Gestion des packages voyage (Omra, Hajj, Ziarra, Tourisme) avec Prisma
 */

const prismaService = require('./prismaService');

class PackageService {
  constructor() {
    // Lazy loading pour éviter l'init avant connectDB()
    this._prisma = null;
  }

  // Getter lazy pour Prisma
  get prisma() {
    if (!this._prisma) {
      this._prisma = prismaService.db;
    }
    return this._prisma;
  }

  // ── LECTURE ───────────────────────────────────────────────────────────

  /**
   * Liste tous les packages avec filtres et pagination
   */
  async findAll(options = {}) {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      type,
      actif,
      orderBy = { date_depart: 'desc' } 
    } = options;

    const where = {};
    
    // Recherche par nom
    if (search) {
      where.nom = { contains: search, mode: 'insensitive' };
    }
    
    // Filtre par type
    if (type) {
      where.type = type;
    }

    // Filtre par statut actif
    if (actif !== undefined) {
      where.actif = actif;
    }

    const [packages, total] = await Promise.all([
      this.prisma.packages.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          agencies: {
            select: {
              id: true,
              nom: true
            }
          }
        }
      }),
      this.prisma.packages.count({ where })
    ]);

    return {
      packages,
      total,
      page,
      pages: Math.ceil(total / limit),
      count: packages.length
    };
  }

  /**
   * Trouver un package par ID
   */
  async findById(id) {
    return this.prisma.packages.findUnique({
      where: { id },
      include: {
        agencies: {
          select: {
            id: true,
            nom: true
          }
        },
        package_hotels: {
          include: {
            hotels: true
          }
        },
        package_flights: {
          include: {
            flights: true
          }
        }
      }
    });
  }

  /**
   * Créer un package
   */
  async create(data) {
    // Mapper les champs MongoDB vers PostgreSQL
    const packageData = {
      nom: data.nomReference || data.nom,
      type: data.type || 'OUMRA',
      sous_type: data.sousType,
      prix: data.prixEco || data.prix || 0,
      devise: 'FCFA',
      prix_fcfa: data.prixEco || data.prix || 0,
      duree_jours: data.dureeJours,
      date_depart: data.dateDepart ? new Date(data.dateDepart) : null,
      date_retour: data.dateRetour ? new Date(data.dateRetour) : null,
      date_limite: data.dateLimite ? new Date(data.dateLimite) : null,
      places_dispo: data.quotaMax || data.placesDisponibles,
      actif: data.actif !== false,
      agency_id: data.agency_id || process.env.DEFAULT_AGENCY_ID,
      created_at: new Date(),
      updated_at: new Date()
    };

    return this.prisma.packages.create({
      data: packageData,
      include: {
        agencies: {
          select: {
            id: true,
            nom: true
          }
        }
      }
    });
  }

  /**
   * Mettre à jour un package
   */
  async update(id, data) {
    const updateData = {};

    // Mapping sécurisé des champs
    if (data.nomReference || data.nom) updateData.nom = data.nomReference || data.nom;
    if (data.type) updateData.type = data.type;
    if (data.sousType !== undefined) updateData.sous_type = data.sousType;
    if (data.prix !== undefined) updateData.prix = data.prix;
    if (data.prixEco !== undefined) updateData.prix = data.prixEco;
    if (data.dureeJours !== undefined) updateData.duree_jours = data.dureeJours;
    if (data.dateDepart) updateData.date_depart = new Date(data.dateDepart);
    if (data.dateRetour) updateData.date_retour = new Date(data.dateRetour);
    if (data.dateLimite) updateData.date_limite = new Date(data.dateLimite);
    if (data.quotaMax !== undefined) updateData.places_dispo = data.quotaMax;
    if (data.placesDisponibles !== undefined) updateData.places_dispo = data.placesDisponibles;
    if (data.actif !== undefined) updateData.actif = data.actif;
    
    updateData.updated_at = new Date();

    return this.prisma.packages.update({
      where: { id },
      data: updateData,
      include: {
        agencies: {
          select: {
            id: true,
            nom: true
          }
        }
      }
    });
  }

  /**
   * Supprimer un package
   */
  async delete(id) {
    return this.prisma.packages.delete({
      where: { id }
    });
  }

  /**
   * Packages actifs uniquement
   */
  async findActive(options = {}) {
    const { type, limit = 50 } = options;
    
    const where = { actif: true };
    if (type) where.type = type;

    return this.prisma.packages.findMany({
      where,
      orderBy: { date_depart: 'asc' },
      take: limit,
      include: {
        agencies: {
          select: {
            id: true,
            nom: true
          }
        }
      }
    });
  }

  /**
   * Packages par type
   */
  async findByType(type, options = {}) {
    const { page = 1, limit = 50, actif = true } = options;

    const where = { type };
    if (actif !== undefined) where.actif = actif;

    const [packages, total] = await Promise.all([
      this.prisma.packages.findMany({
        where,
        orderBy: { date_depart: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          agencies: {
            select: {
              id: true,
              nom: true
            }
          }
        }
      }),
      this.prisma.packages.count({ where })
    ]);

    return { packages, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Vérifier l'unicité du nom
   */
  async checkNameExists(nom, excludeId = null) {
    const where = {
      nom: { equals: nom, mode: 'insensitive' }
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const existing = await this.prisma.packages.findFirst({ where });
    return !!existing;
  }

  /**
   * Statistiques packages
   */
  async getStats() {
    const [total, actifs, inactifs, parType] = await Promise.all([
      this.prisma.packages.count(),
      this.prisma.packages.count({ where: { actif: true } }),
      this.prisma.packages.count({ where: { actif: false } }),
      this.prisma.packages.groupBy({
        by: ['type'],
        _count: { id: true }
      })
    ]);

    return {
      total,
      actifs,
      inactifs,
      parType: parType.map(t => ({ type: t.type, count: t._count.id }))
    };
  }
}

// Export singleton
module.exports = new PackageService();

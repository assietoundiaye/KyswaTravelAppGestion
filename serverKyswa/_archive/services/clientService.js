/**
 * Service Client PostgreSQL - Remplace le modèle MongoDB Client
 * Utilise Prisma pour toutes les opérations CRUD
 */

const prismaService = require('./prismaService');

class ClientService {
  constructor() {
    // Initialisation lazy - ne pas accéder à prisma.db dans le constructeur
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

  async findAll(options = {}) {
    const { page = 1, limit = 50, search, orderBy = { created_at: 'desc' } } = options;
    
    const where = search ? {
      OR: [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [clients, total] = await Promise.all([
      this.prisma.clients.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reservations: {
            select: { id: true, numero: true, statut_client: true }
          }
        }
      }),
      this.prisma.clients.count({ where })
    ]);

    return {
      clients,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async findById(id) {
    return this.prisma.clients.findUnique({
      where: { id },
      include: {
        reservations: {
          orderBy: { created_at: 'desc' },
          include: {
            packages: true,
            paiements: true
          }
        },
        documents: true,
        audit_logs: {
          take: 10,
          orderBy: { created_at: 'desc' }
        }
      }
    });
  }

  async findByTelephone(telephone) {
    return this.prisma.clients.findFirst({
      where: { telephone }
    });
  }

  async findByEmail(email) {
    return this.prisma.clients.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    });
  }

  // ── CRÉATION ──────────────────────────────────────────────────────────

  async create(clientData) {
    // Vérifier unicité téléphone
    if (clientData.telephone) {
      const existingClient = await this.findByTelephone(clientData.telephone);
      if (existingClient) {
        throw new Error(`Un client avec le téléphone ${clientData.telephone} existe déjà`);
      }
    }

    // Vérifier unicité email
    if (clientData.email) {
      const existingEmail = await this.findByEmail(clientData.email);
      if (existingEmail) {
        throw new Error(`Un client avec l'email ${clientData.email} existe déjà`);
      }
    }

    return this.prisma.clients.create({
      data: {
        ...clientData,
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        reservations: true
      }
    });
  }

  // ── MISE À JOUR ───────────────────────────────────────────────────────

  async update(id, updateData) {
    // Vérifier que le client existe
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Client avec ID ${id} non trouvé`);
    }

    // Vérifier unicité téléphone (si modifié)
    if (updateData.telephone && updateData.telephone !== existing.telephone) {
      const existingPhone = await this.findByTelephone(updateData.telephone);
      if (existingPhone && existingPhone.id !== id) {
        throw new Error(`Le téléphone ${updateData.telephone} est déjà utilisé`);
      }
    }

    // Vérifier unicité email (si modifié)
    if (updateData.email && updateData.email !== existing.email) {
      const existingEmail = await this.findByEmail(updateData.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new Error(`L'email ${updateData.email} est déjà utilisé`);
      }
    }

    return this.prisma.clients.update({
      where: { id },
      data: {
        ...updateData,
        updated_at: new Date()
      },
      include: {
        reservations: true
      }
    });
  }

  // ── SUPPRESSION ───────────────────────────────────────────────────────

  async delete(id) {
    // Vérifier qu'il n'y a pas de réservations actives
    const reservationsCount = await this.prisma.reservations.count({
      where: { 
        client_id: id,
        statut_client: {
          in: ['CONFIRMEE', 'EN_COURS', 'ATTENTE_PAIEMENT']
        }
      }
    });

    if (reservationsCount > 0) {
      throw new Error('Impossible de supprimer un client avec des réservations actives');
    }

    return this.prisma.clients.delete({
      where: { id }
    });
  }

  // ── STATISTIQUES ──────────────────────────────────────────────────────

  async getStats() {
    const [total, nouveau_mois, avec_reservations] = await Promise.all([
      this.prisma.clients.count(),
      this.prisma.clients.count({
        where: {
          created_at: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      this.prisma.clients.count({
        where: {
          reservations: {
            some: {}
          }
        }
      })
    ]);

    return {
      total,
      nouveau_mois,
      avec_reservations,
      sans_reservation: total - avec_reservations
    };
  }

  // ── RECHERCHE AVANCÉE ─────────────────────────────────────────────────

  async searchAdvanced(filters) {
    const where = {};

    if (filters.nom) {
      where.nom = { contains: filters.nom, mode: 'insensitive' };
    }

    if (filters.ville) {
      where.ville = { contains: filters.ville, mode: 'insensitive' };
    }

    if (filters.date_naissance_debut && filters.date_naissance_fin) {
      where.date_naissance = {
        gte: new Date(filters.date_naissance_debut),
        lte: new Date(filters.date_naissance_fin)
      };
    }

    if (filters.a_voyage !== undefined) {
      if (filters.a_voyage) {
        where.reservations = { some: { statut_client: 'TERMINEE' } };
      } else {
        where.reservations = { none: { statut_client: 'TERMINEE' } };
      }
    }

    return this.prisma.clients.findMany({
      where,
      include: {
        reservations: {
          select: { 
            id: true, 
            numero: true, 
            statut_client: true,
            packages: { select: { nom: true } }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }
}

module.exports = new ClientService();
/**
 * Service Prisma centralisé pour l'accès à la base de données PostgreSQL
 * Remplace tous les modèles Mongoose
 */

const { getPrisma } = require('../config/database');

class PrismaService {
  constructor() {
    this.prisma = null;
  }

  // Initialiser Prisma (appelé automatiquement)
  init() {
    if (!this.prisma) {
      this.prisma = getPrisma();
    }
    return this.prisma;
  }

  // Obtenir l'instance Prisma
  get db() {
    if (!this.prisma) {
      this.prisma = this.init();
    }
    return this.prisma;
  }

  // ── MÉTHODES GÉNÉRIQUES CRUD ────────────────────────────────────────

  async findMany(model, options = {}) {
    return this.db[model].findMany(options);
  }

  async findUnique(model, options) {
    return this.db[model].findUnique(options);
  }

  async findFirst(model, options) {
    return this.db[model].findFirst(options);
  }

  async create(model, data) {
    return this.db[model].create({ data });
  }

  async update(model, where, data) {
    return this.db[model].update({ where, data });
  }

  async upsert(model, where, create, update) {
    return this.db[model].upsert({ where, create, update });
  }

  async delete(model, where) {
    return this.db[model].delete({ where });
  }

  async deleteMany(model, where) {
    return this.db[model].deleteMany({ where });
  }

  async count(model, where = {}) {
    return this.db[model].count({ where });
  }

  // ── MÉTHODES SPÉCIALISÉES ──────────────────────────────────────────

  // Requêtes SQL brutes
  async queryRaw(sql, ...params) {
    return this.db.$queryRaw(sql, ...params);
  }

  // Transactions
  async transaction(operations) {
    return this.db.$transaction(operations);
  }

  // Métriques et monitoring
  async getMetrics() {
    return this.db.$metrics.json();
  }

  // Health check
  async healthCheck() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }
}

// Instance singleton
const prismaService = new PrismaService();

module.exports = prismaService;
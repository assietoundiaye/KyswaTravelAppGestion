/**
 * @fileoverview UserRepository — Table `profiles` (Supabase)
 *
 * Même table que AuthRepository (`profiles`), mais avec des méthodes
 * orientées administration des utilisateurs (CRUD complet, gestion des rôles).
 *
 * Rôles disponibles (contrainte check en DB) : admin, agent, dg, comptable, commercial
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class UserRepository extends BaseRepository {
  constructor() {
    super(prismaClient.profiles);
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE
  // ─────────────────────────────────────────────────────

  async findByEmail(email) {
    return await this.findOne({ email });
  }

  async findByTelephone(telephone) {
    return await this.findOne({ telephone });
  }

  async findActifs(options = {}) {
    return await this.findMany({ actif: true }, options);
  }

  async findByRole(role, options = {}) {
    return await this.findMany({ role, actif: true }, options);
  }

  async searchUsers(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where = {
      OR: [
        { nom:    { contains: query, mode: 'insensitive' } },
        { prenom: { contains: query, mode: 'insensitive' } },
        { email:  { contains: query, mode: 'insensitive' } },
        { poste:  { contains: query, mode: 'insensitive' } },
      ]
    };
    const [data, total] = await Promise.all([
      this.model.findMany({ where, skip, take: limit, orderBy: { nom: 'asc' } }),
      this.model.count({ where })
    ]);
    return { data, total };
  }

  // ─────────────────────────────────────────────────────
  // VÉRIFICATIONS
  // ─────────────────────────────────────────────────────

  async emailExists(email) {
    return await this.exists({ email });
  }

  async telephoneExists(telephone) {
    return await this.exists({ telephone });
  }

  // ─────────────────────────────────────────────────────
  // MISES À JOUR
  // ─────────────────────────────────────────────────────

  async setActif(id, actif) {
    return await this.updateById(id, { actif });
  }

  async updateRole(id, role) {
    return await this.updateById(id, { role });
  }

  async updatePoste(id, poste) {
    return await this.updateById(id, { poste });
  }

  async updateCouleur(id, couleur) {
    return await this.updateById(id, { couleur });
  }

  async updateProfile(id, data) {
    const allowed = ['nom', 'prenom', 'telephone', 'bio', 'location', 'website', 'avatar_url', 'couleur'];
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([k]) => allowed.includes(k))
    );
    return await this.updateById(id, filtered);
  }

  // ─────────────────────────────────────────────────────
  // ACCÈS SÉLECTIF (sécurité — sans données sensibles)
  // ─────────────────────────────────────────────────────

  async findAllPublic(options = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.findMany({
        skip, take: limit,
        select: {
          id: true, nom: true, prenom: true, email: true,
          role: true, poste: true, actif: true,
          avatar_url: true, couleur: true, telephone: true,
          created_at: true
        },
        orderBy: { nom: 'asc' }
      }),
      this.model.count()
    ]);
    return { data, total };
  }

  async findByIdPublic(id) {
    return await this.model.findUnique({
      where: { id },
      select: {
        id: true, nom: true, prenom: true, email: true,
        role: true, poste: true, actif: true,
        avatar_url: true, couleur: true, bio: true,
        location: true, website: true, telephone: true,
        created_at: true, theme: true, language: true
      }
    });
  }

  // ─────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────

  async getStatsByRole() {
    const groups = await this.model.groupBy({
      by: ['role', 'actif'],
      _count: { _all: true }
    });
    return groups.map(g => ({
      role:  g.role,
      actif: g.actif,
      count: g._count._all
    }));
  }
}

module.exports = UserRepository;

/**
 * @fileoverview AuthRepository — Table `profiles` & `auth.users` (Supabase)
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class AuthRepository extends BaseRepository {
  constructor() {
    super(prismaClient.profiles);
    this.usersModel = prismaClient.users;
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE PROFIL & AUTH USER
  // ─────────────────────────────────────────────────────

  async findByEmail(email) {
    if (!email) return null;
    return await this.model.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    });
  }

  async findByTelephone(telephone) {
    if (!telephone) return null;
    return await this.model.findFirst({
      where: { telephone }
    });
  }

  async findProfileById(id) {
    return await this.findById(id);
  }

  /**
   * Trouve le profil et les identifiants hashés dans auth.users par Email
   */
  async findAuthUserByEmail(email) {
    const profile = await this.findByEmail(email);
    if (!profile) return null;

    const authUser = await this.usersModel.findFirst({
      where: { id: profile.id }
    });

    return { profile, authUser };
  }

  /**
   * Trouve le profil et les identifiants hashés dans auth.users par Téléphone
   */
  async findAuthUserByTelephone(telephone) {
    const profile = await this.findByTelephone(telephone);
    if (!profile) return null;

    const authUser = await this.usersModel.findFirst({
      where: { id: profile.id }
    });

    return { profile, authUser };
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

  // ─────────────────────────────────────────────────────
  // RÉCUPÉRATION PAR RÔLE / STATUT
  // ─────────────────────────────────────────────────────

  async getActiveProfiles() {
    return await this.model.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' }
    });
  }

  async getProfilesByRole(role) {
    return await this.model.findMany({
      where: { role, actif: true },
      orderBy: { nom: 'asc' }
    });
  }

  async getAllAgents() {
    return await this.model.findMany({
      where: {
        actif: true,
        role: { in: ['admin', 'agent', 'commercial', 'dg', 'secretaire'] }
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        poste: true,
        avatar_url: true,
        couleur: true
      },
      orderBy: { nom: 'asc' }
    });
  }

  // ─────────────────────────────────────────────────────
  // MISES À JOUR
  // ─────────────────────────────────────────────────────

  async updatePreferences(id, { theme, language, notif_enabled, msg_privacy }) {
    return await this.model.update({
      where: { id },
      data: { theme, language, notif_enabled, msg_privacy }
    });
  }

  async updateProfile(id, { nom, prenom, bio, location, website, avatar_url, telephone }) {
    return await this.model.update({
      where: { id },
      data: { nom, prenom, bio, location, website, avatar_url, telephone }
    });
  }

  async setActif(id, actif) {
    return await this.model.update({
      where: { id },
      data: { actif }
    });
  }
}

module.exports = AuthRepository;

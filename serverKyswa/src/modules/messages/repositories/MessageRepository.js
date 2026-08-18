/**
 * @fileoverview MessageRepository — Tables `messages` + `canaux` + `message_reads` (Supabase)
 *
 * Structure `messages` :
 *   id, canal_id, sender_id, contenu, priorite, created_at,
 *   expediteur_id, destinataire
 *
 * Structure `canaux` :
 *   id (UUID), slug (unique), nom, couleur, ordre, created_at
 *
 * Structure `message_reads` :
 *   message_id, user_id (clé composée), lu_at
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class MessageRepository extends BaseRepository {
  constructor() {
    super(prismaClient.messages);
    this.canauxModel = prismaClient.canaux;
    this.readsModel  = prismaClient.message_reads;
  }

  // ─────────────────────────────────────────────────────
  // MESSAGES
  // ─────────────────────────────────────────────────────

  async findByCanal(canal_id, options = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;
    return await this.model.findMany({
      where: { canal_id },
      skip,
      take: limit,
      include: {
        profiles_messages_sender_idToprofiles: {
          select: { id: true, nom: true, prenom: true, avatar_url: true, couleur: true }
        },
        message_reads: { select: { user_id: true, lu_at: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async findBySender(sender_id, options = {}) {
    return await this.findMany({ sender_id }, options);
  }

  async findByDestinataire(destinataire, options = {}) {
    return await this.findMany({ destinataire }, options);
  }

  async findRecentsParCanal(canal_id, limit = 20) {
    return await this.model.findMany({
      where: { canal_id },
      take: limit,
      include: {
        profiles_messages_sender_idToprofiles: {
          select: { id: true, nom: true, prenom: true, avatar_url: true, couleur: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async countNonLus(user_id) {
    // Messages où l'utilisateur n'a pas de lecture enregistrée
    const total = await this.model.count({
      where: {
        NOT: {
          message_reads: {
            some: { user_id }
          }
        }
      }
    });
    return total;
  }

  async countNonLusParCanal(user_id) {
    const canaux = await this.canauxModel.findMany({
      select: { id: true, slug: true, nom: true }
    });

    const counts = await Promise.all(
      canaux.map(async c => {
        const nonLus = await this.model.count({
          where: {
            canal_id: c.id,
            NOT: {
              message_reads: {
                some: { user_id }
              }
            }
          }
        });
        return { canal: c, nonLus };
      })
    );

    return counts;
  }

  // ─────────────────────────────────────────────────────
  // CANAUX
  // ─────────────────────────────────────────────────────

  async findAllCanaux() {
    return await this.canauxModel.findMany({
      orderBy: { ordre: 'asc' }
    });
  }

  async findCanalBySlug(slug) {
    return await this.canauxModel.findUnique({ where: { slug } });
  }

  async createCanal(data) {
    return await this.canauxModel.create({ data });
  }

  async updateCanal(id, data) {
    return await this.canauxModel.update({ where: { id }, data });
  }

  async deleteCanal(id) {
    return await this.canauxModel.delete({ where: { id } });
  }

  // ─────────────────────────────────────────────────────
  // LECTURE (LU/NON LU)
  // ─────────────────────────────────────────────────────

  async marquerLu(message_id, user_id) {
    return await this.readsModel.upsert({
      where: { message_id_user_id: { message_id, user_id } },
      create: { message_id, user_id },
      update: { lu_at: new Date() }
    });
  }

  async marquerTousLusParCanal(canal_id, user_id) {
    const messages = await this.model.findMany({
      where: { canal_id },
      select: { id: true }
    });

    const ops = messages.map(m =>
      this.readsModel.upsert({
        where: { message_id_user_id: { message_id: m.id, user_id } },
        create: { message_id: m.id, user_id },
        update: { lu_at: new Date() }
      })
    );

    return await Promise.all(ops);
  }
}

module.exports = MessageRepository;

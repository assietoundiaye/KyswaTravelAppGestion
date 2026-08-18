/**
 * @fileoverview AuditRepository — Table `audit_logs` (PostgreSQL)
 *
 * Vrais champs de la table :
 *   id (uuid), user_id (uuid), user_nom (text), user_role (text),
 *   action (text), module (text), details (jsonb), created_at (timestamptz)
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class AuditRepository extends BaseRepository {
  constructor() {
    super(prismaClient.audit_logs);
  }

  // ─────────────────────────────────────────────────────
  // ÉCRITURE
  // ─────────────────────────────────────────────────────

  /**
   * Enregistrer une action d'audit
   * @param {Object} params
   * @param {String} params.user_id    - UUID du profil qui a effectué l'action
   * @param {String} params.user_nom   - Nom affiché de l'utilisateur
   * @param {String} params.user_role  - Rôle de l'utilisateur
   * @param {String} params.action     - Type d'action (CREATE, UPDATE, DELETE, LOGIN, etc.)
   * @param {String} params.module     - Module concerné (clients, inscriptions, etc.)
   * @param {Object} params.details    - Données JSON libres
   */
  async log({ user_id, user_nom, user_role, action, module, details }) {
    try {
      return await this.model.create({
        data: {
          user_id:   user_id   || null,
          user_nom:  user_nom  || null,
          user_role: user_role || null,
          action,
          module,
          details: details || undefined,
        }
      });
    } catch (e) {
      console.error('[AuditRepository] Erreur log:', e.message);
    }
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE
  // ─────────────────────────────────────────────────────

  /**
   * Liste paginée avec filtres optionnels
   * @param {Object} filters  - { action?, module?, search? }
   * @param {Object} options  - { page, limit }
   */
  async findFiltered(filters = {}, options = {}) {
    const { page = 1, limit = 100 } = options;
    const skip = (page - 1) * limit;

    const where = {};
    if (filters.action && filters.action !== 'tous')  where.action = filters.action;  // ex: 'CONNEXION', 'CREATION'
    if (filters.module && filters.module !== 'tous')  where.module = { equals: filters.module, mode: 'insensitive' };
    if (filters.search) {
      where.OR = [
        { user_nom:  { contains: filters.search, mode: 'insensitive' } },
        { user_role: { contains: filters.search, mode: 'insensitive' } },
        { module:    { contains: filters.search, mode: 'insensitive' } },
        { action:    { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.model.findMany({
        where, skip, take: limit,
        orderBy: { created_at: 'desc' }
      }),
      this.model.count({ where })
    ]);

    return {
      data: data.map(l => this._normalize(l)),
      total
    };
  }

  async findRecents(limit = 200) {
    const data = await this.model.findMany({
      take: limit,
      orderBy: { created_at: 'desc' }
    });
    return data.map(l => this._normalize(l));
  }

  // ─────────────────────────────────────────────────────
  // NORMALIZATION — mapping vers les champs attendus par le frontend
  // ─────────────────────────────────────────────────────

  _normalize(log) {
    if (!log) return log;
    return {
      ...log,
      _id:       log.id,
      // Frontend lit l.userId.nom / l.userId.prenom / l.userId.role
      userId: {
        _id:    log.user_id,
        nom:    log.user_nom || '',
        prenom: '',
        role:   log.user_role || '',
      },
      userNom:  log.user_nom,
      userRole: log.user_role,
      // Frontend lit l.createdAt
      createdAt: log.created_at,
    };
  }
}

module.exports = AuditRepository;

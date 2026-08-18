/**
 * @fileoverview VisaRepository — Table `visas` (Supabase)
 *
 * Structure de la table `visas` :
 *   id, inscription_id, client_id, depart_id,
 *   passeport_collecte, date_collecte, scan_ok,
 *   envoye_nusuk, date_envoi, num_dossier,
 *   visa_recu, date_reception, num_visa,
 *   nom_ok, passeport_ok, motif_rejet,
 *   remis_client, date_remise, notes,
 *   agent_id, created_at, updated_at
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class VisaRepository extends BaseRepository {
  constructor() {
    super(prismaClient.visas);
    this.defaultInclude = {
      clients: true,
      inscriptions: true,
    };
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE MÉTIER
  // ─────────────────────────────────────────────────────

  async findByClient(client_id) {
    return await this.model.findMany({
      where: { client_id },
      orderBy: { created_at: 'desc' }
    });
  }

  async findByInscription(inscription_id) {
    return await this.model.findMany({
      where: { inscription_id },
      orderBy: { created_at: 'desc' }
    });
  }

  async findByDepart(depart_id) {
    return await this.model.findMany({
      where: { depart_id },
      include: {
        clients: { select: { id: true, nom: true, prenom: true, telephone: true, n_passeport: true } },
        inscriptions: { select: { id: true, numero: true, statut_client: true } }
      },
      orderBy: { created_at: 'asc' }
    });
  }

  async findByAgent(agent_id, options = {}) {
    return await this.findMany({ agent_id }, options);
  }

  // ─────────────────────────────────────────────────────
  // ÉTATS DU PIPELINE VISA
  // ─────────────────────────────────────────────────────

  async findPasseportsNonCollectes(depart_id) {
    return await this.model.findMany({
      where: { depart_id, passeport_collecte: false },
      include: { clients: { select: { id: true, nom: true, prenom: true, telephone: true } } }
    });
  }

  async findEnAttenteEnvoiNusuk(depart_id) {
    return await this.model.findMany({
      where: { depart_id, scan_ok: true, envoye_nusuk: false },
      include: { clients: { select: { id: true, nom: true, prenom: true } } }
    });
  }

  async findVisasRecus(depart_id) {
    return await this.model.findMany({
      where: { depart_id, visa_recu: true },
      include: { clients: { select: { id: true, nom: true, prenom: true, telephone: true } } }
    });
  }

  async findVisasNonRemis(depart_id) {
    return await this.model.findMany({
      where: { depart_id, visa_recu: true, remis_client: false },
      include: { clients: { select: { id: true, nom: true, prenom: true, telephone: true } } }
    });
  }

  async findRejetes(depart_id) {
    return await this.model.findMany({
      where: { depart_id, visa_recu: false, envoye_nusuk: true },
      include: { clients: { select: { id: true, nom: true, prenom: true } } }
    });
  }

  // ─────────────────────────────────────────────────────
  // MISES À JOUR ÉTAPES PIPELINE
  // ─────────────────────────────────────────────────────

  async marquerPasseportCollecte(id, date_collecte) {
    return await this.updateById(id, {
      passeport_collecte: true,
      date_collecte: date_collecte ? new Date(date_collecte) : new Date()
    });
  }

  async marquerScanOk(id) {
    return await this.updateById(id, { scan_ok: true });
  }

  async marquerEnvoyeNusuk(id, date_envoi, num_dossier = null) {
    return await this.updateById(id, {
      envoye_nusuk: true,
      date_envoi: date_envoi ? new Date(date_envoi) : new Date(),
      num_dossier
    });
  }

  async marquerVisaRecu(id, { num_visa, date_reception, nom_ok, passeport_ok }) {
    return await this.updateById(id, {
      visa_recu: true,
      num_visa,
      date_reception: date_reception ? new Date(date_reception) : new Date(),
      nom_ok:         nom_ok !== undefined ? nom_ok : null,
      passeport_ok:   passeport_ok !== undefined ? passeport_ok : null
    });
  }

  async marquerRemisClient(id, date_remise) {
    return await this.updateById(id, {
      remis_client: true,
      date_remise: date_remise ? new Date(date_remise) : new Date()
    });
  }

  // ─────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────

  async getStatsByDepart(depart_id) {
    const [total, collectes, envoyes, recus, remis] = await Promise.all([
      this.model.count({ where: { depart_id } }),
      this.model.count({ where: { depart_id, passeport_collecte: true } }),
      this.model.count({ where: { depart_id, envoye_nusuk: true } }),
      this.model.count({ where: { depart_id, visa_recu: true } }),
      this.model.count({ where: { depart_id, remis_client: true } }),
    ]);
    return { total, collectes, envoyes, recus, remis };
  }
}

module.exports = VisaRepository;

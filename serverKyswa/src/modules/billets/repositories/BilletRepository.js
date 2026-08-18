/**
 * @fileoverview BilletRepository — Tables `billets_pelerins` + `billets_groupe` (Supabase)
 *
 * Structure `billets_pelerins` :
 *   id, inscription_id, client_id, depart_id, paye_compagnie,
 *   date_paiement, billet_emis, num_billet, nom_sur_billet,
 *   verifie, notes, created_at, updated_at
 *
 * Structure `billets_groupe` :
 *   id, depart_id (unique), compagnie, num_vol_aller, num_vol_retour,
 *   date_depart_vol, heure_depart, date_retour_vol, heure_retour,
 *   aeroport_depart, escale, tarif_negocie, tarif_public,
 *   nb_places_negociees, acompte_verse, date_acompte, solde_verse,
 *   date_solde, manifeste_envoye, date_manifeste, billets_recus,
 *   date_reception_billets, statut, notes, created_at, updated_at
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class BilletRepository extends BaseRepository {
  constructor() {
    // Délégué principal : billets_pelerins (suivi individuel)
    super(prismaClient.billets_pelerins);
    // Délégué secondaire : billets_groupe (contrat compagnie)
    this.groupeModel = prismaClient.billets_groupe;
  }

  // ─────────────────────────────────────────────────────
  // BILLETS PÈLERINS (individuels)
  // ─────────────────────────────────────────────────────

  async findByDepart(depart_id) {
    return await this.model.findMany({
      where: { depart_id },
      include: {
        clients:      { select: { id: true, nom: true, prenom: true, telephone: true, n_passeport: true } },
        inscriptions: { select: { id: true, numero: true, statut_client: true } },
      },
      orderBy: { created_at: 'asc' }
    });
  }

  async findByClient(client_id) {
    return await this.model.findMany({
      where: { client_id },
      include: { departs: { select: { id: true, nom_depart: true, date_depart: true } } },
      orderBy: { created_at: 'desc' }
    });
  }

  async findByInscription(inscription_id) {
    return await this.model.findMany({
      where: { inscription_id },
      orderBy: { created_at: 'desc' }
    });
  }

  async findNonEmis(depart_id) {
    return await this.model.findMany({
      where: { depart_id, billet_emis: false },
      include: { clients: { select: { id: true, nom: true, prenom: true, telephone: true } } }
    });
  }

  async findNonVerifies(depart_id) {
    return await this.model.findMany({
      where: { depart_id, billet_emis: true, verifie: false },
      include: { clients: { select: { id: true, nom: true, prenom: true } } }
    });
  }

  async marquerPayeCompagnie(id, date_paiement) {
    return await this.updateById(id, {
      paye_compagnie: true,
      date_paiement:  date_paiement ? new Date(date_paiement) : new Date()
    });
  }

  async emettreBillet(id, { num_billet, nom_sur_billet }) {
    return await this.updateById(id, {
      billet_emis: true,
      num_billet,
      nom_sur_billet
    });
  }

  async verifier(id) {
    return await this.updateById(id, { verifie: true });
  }

  async getStatsByDepart(depart_id) {
    const [total, payesCompagnie, emis, verifies] = await Promise.all([
      this.model.count({ where: { depart_id } }),
      this.model.count({ where: { depart_id, paye_compagnie: true } }),
      this.model.count({ where: { depart_id, billet_emis: true } }),
      this.model.count({ where: { depart_id, verifie: true } }),
    ]);
    return { total, payesCompagnie, emis, verifies };
  }

  // ─────────────────────────────────────────────────────
  // BILLET GROUPE (contrat compagnie)
  // ─────────────────────────────────────────────────────

  async findGroupeByDepart(depart_id) {
    return await this.groupeModel.findUnique({
      where: { depart_id },
      include: { departs: { select: { id: true, nom_depart: true, date_depart: true } } }
    });
  }

  async createGroupe(data) {
    return await this.groupeModel.create({ data });
  }

  async updateGroupe(depart_id, data) {
    return await this.groupeModel.update({ where: { depart_id }, data });
  }

  async marquerManifeste(depart_id, date_manifeste) {
    return await this.groupeModel.update({
      where: { depart_id },
      data: {
        manifeste_envoye: true,
        date_manifeste: date_manifeste ? new Date(date_manifeste) : new Date()
      }
    });
  }

  async marquerBilletsRecus(depart_id, date_reception) {
    return await this.groupeModel.update({
      where: { depart_id },
      data: {
        billets_recus: true,
        date_reception_billets: date_reception ? new Date(date_reception) : new Date(),
        statut: 'Reçus'
      }
    });
  }
}

module.exports = BilletRepository;

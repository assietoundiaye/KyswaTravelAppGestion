/**
 * @fileoverview PackageRepository — Tables `departs` + `packages` (Supabase)
 *
 * IMPORTANT : Dans Supabase, deux tables de "packages" coexistent :
 *
 *   1. `departs` — Les départs internes de Kyswa (Omra, Hajj, Ziyara)
 *      Champs : id, service, nom_depart, date_depart, date_retour,
 *               places_total, places_restantes, actif, created_at
 *
 *   2. `packages` — Packages scraped chez les concurrents (comparaison marché)
 *      Champs : id, agency_id, nom, type, sous_type, prix, devise,
 *               prix_fcfa, duree_jours, date_depart, places_dispo,
 *               actif, source_url, scraped_at, ...
 *
 * Ce repository gère principalement `departs` (départs internes Kyswa).
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const { normalizeItem } = BaseRepository;
const prismaClient = require('../../../database/client');

class PackageRepository extends BaseRepository {
  constructor() {
    // Délégué principal : departs (voyages internes Kyswa)
    super(prismaClient.departs);
    // Délégué secondaire : packages (marché concurrence)
    this.packagesModel = prismaClient.packages;
    // Spécifier le nom de la table pour le filtrage des champs
    this.tableName = 'departs';
    this.defaultInclude = {
      billets_groupe: true,
    };
  }

  // ─────────────────────────────────────────────────────
  // DÉPARTS KYSWA (departs)
  // ─────────────────────────────────────────────────────

  async create(data) {
    const createData = { ...data };
    if (createData.type) {
      const t = String(createData.type).toUpperCase();
      if (t === 'OUMRA') createData.service = 'Oumra';
      else if (t === 'HAJJ') createData.service = 'Hajj';
      else if (t === 'ZIYARA' || t.includes('ZIARA')) createData.service = 'Ziara Fès';
    }
    if (!createData.service) createData.service = 'Oumra';

    const created = await super.create(createData);

    if (created?.id && (data.compagnieAerienne || data.numeroVol || data.villeDepart)) {
      try {
        await prismaClient.billets_groupe.create({
          data: {
            depart_id: created.id,
            compagnie: data.compagnieAerienne || null,
            num_vol_aller: data.numeroVol || null,
            aeroport_depart: data.villeDepart || 'DSS — Dakar',
          }
        });
      } catch (e) {
        console.warn('[PackageRepository] Erreur creation billets_groupe:', e.message);
      }
    }

    return await this.findById(created.id);
  }

  async updateById(id, data) {
    const updateData = { ...data };
    if (updateData.type) {
      const t = String(updateData.type).toUpperCase();
      if (t === 'OUMRA') updateData.service = 'Oumra';
      else if (t === 'HAJJ') updateData.service = 'Hajj';
      else if (t === 'ZIYARA' || t.includes('ZIARA')) updateData.service = 'Ziara Fès';
    }

    await super.updateById(id, updateData);

    if (data.compagnieAerienne !== undefined || data.numeroVol !== undefined || data.villeDepart !== undefined) {
      try {
        await prismaClient.billets_groupe.upsert({
          where: { depart_id: id },
          create: {
            depart_id: id,
            compagnie: data.compagnieAerienne || null,
            num_vol_aller: data.numeroVol || null,
            aeroport_depart: data.villeDepart || 'DSS — Dakar',
          },
          update: {
            compagnie: data.compagnieAerienne || undefined,
            num_vol_aller: data.numeroVol || undefined,
            aeroport_depart: data.villeDepart || undefined,
          }
        });
      } catch (e) {
        console.warn('[PackageRepository] Erreur maj billets_groupe:', e.message);
      }
    }

    return await this.findById(id);
  }

  async findActifs() {
    const raw = await this.model.findMany({
      where: { actif: true },
      include: this.defaultInclude,
      orderBy: { date_depart: 'asc' }
    });
    return raw.map(item => normalizeItem(item));
  }

  async findByService(service) {
    const raw = await this.model.findMany({
      where: { service },
      include: this.defaultInclude,
      orderBy: { date_depart: 'desc' }
    });
    return raw.map(item => normalizeItem(item));
  }

  async findWithStats(id) {
    return await this.model.findUnique({
      where: { id },
      include: {
        inscriptions:      { select: { id: true, statut_paiement: true, prix_total: true } },
        visas:             { select: { id: true, visa_recu: true, remis_client: true } },
        billets_pelerins:  { select: { id: true, billet_emis: true, paye_compagnie: true } },
        billets_groupe:    true,
        depenses:          { select: { id: true, montant: true, categorie: true } },
        reunions:          true,
        reunions_pred_part:true,
      }
    });
  }

  async findProchains(limit = 5) {
    return await this.model.findMany({
      where: {
        actif: true,
        date_depart: { gte: new Date() }
      },
      orderBy: { date_depart: 'asc' },
      take: limit
    });
  }

  async updatePlaces(id, delta) {
    return await this.model.update({
      where: { id },
      data: { places_restantes: { increment: delta } }
    });
  }

  async decrementPlace(id) {
    return await this.updatePlaces(id, -1);
  }

  async incrementPlace(id) {
    return await this.updatePlaces(id, 1);
  }

  async setActif(id, actif) {
    return await this.updateById(id, { actif });
  }

  async getStatsByService() {
    const groups = await this.model.groupBy({
      by: ['service'],
      _count: { _all: true }
    });
    return groups.map(g => ({
      service: g.service,
      count: g._count._all
    }));
  }

  // ─────────────────────────────────────────────────────
  // PACKAGES CONCURRENTS (scraping marché)
  // ─────────────────────────────────────────────────────

  async findPackagesMarche(filters = {}, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where = {};

    if (filters.type)      where.type      = filters.type;
    if (filters.sous_type) where.sous_type = filters.sous_type;
    if (filters.actif !== undefined) where.actif = filters.actif;
    if (filters.prix_min || filters.prix_max) {
      where.prix_fcfa = {};
      if (filters.prix_min) where.prix_fcfa.gte = filters.prix_min;
      if (filters.prix_max) where.prix_fcfa.lte = filters.prix_max;
    }

    const [data, total] = await Promise.all([
      this.packagesModel.findMany({
        where,
        skip, take: limit,
        include: {
          agencies:        { select: { id: true, nom: true } },
          package_hotels:  true,
          package_flights: true,
          package_services: true,
        },
        orderBy: { prix_fcfa: 'asc' }
      }),
      this.packagesModel.count({ where })
    ]);

    return { data, total };
  }

  async getStatsMarcheParType() {
    const groups = await this.packagesModel.groupBy({
      by: ['type'],
      _count: { _all: true },
      _min:   { prix_fcfa: true },
      _max:   { prix_fcfa: true },
      _avg:   { prix_fcfa: true }
    });
    return groups.map(g => ({
      type:    g.type,
      count:   g._count._all,
      prixMin: g._min.prix_fcfa,
      prixMax: g._max.prix_fcfa,
      prixMoy: g._avg.prix_fcfa,
    }));
  }
}

module.exports = PackageRepository;

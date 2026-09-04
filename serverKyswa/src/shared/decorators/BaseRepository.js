/**
 * @fileoverview BaseRepository (Version Prisma / Schéma Supabase réel)
 * Adapteur générique CRUD compatible avec les vrais délégués Prisma
 * issus du schéma introspect de la base de données Supabase.
 *
 * MAPPAGES PRINCIPAUX (MongoDB → Supabase) :
 *   Client       → clients       (id: UUID, nom, prenom, telephone…)
 *   Reservation  → inscriptions  (id: UUID, client_id, service, depart_id…)
 *   PackageK     → departs       (id: UUID, service, nom_depart, date_depart…)
 *   Paiement     → paiements     (id: UUID, inscription_id, montant, mode_paiement…)
 *   Utilisateur  → profiles      (id: UUID, nom, prenom, email, role…)
 *   Billet       → billets_pelerins (id: UUID, inscription_id, client_id…)
 *   Depense      → depenses      (id: UUID, categorie, description, montant…)
 *   Desistement  → desistements  (id: UUID, inscription_id, client_id…)
 *   Visa         → visas         (id: UUID, inscription_id, client_id…)
 *   ZiarraProspect → prospects_ziarra
 *   RapportQuotidien → rapports_quotidiens
 *   Reunion      → reunions
 *   Message      → messages
 *   Document     → documents_admin
 */

const prisma = require('../../database/client');

/**
 * Traduit un filtre simple (style Mongoose) vers un WHERE Prisma.
 * Supporte : égalité, $regex/$options, $gte/$lte/$gt/$lt, $in, $ne, $or, $and.
 */
function mapFilterToPrisma(filter) {
  if (!filter || typeof filter !== 'object') return filter;

  const prismaWhere = {};

  for (const [key, value] of Object.entries(filter)) {
    const prismaKey = key === '_id' ? 'id' : key;

    if (key === '$or') {
      prismaWhere.OR = value.map(mapFilterToPrisma);
      continue;
    }
    if (key === '$and') {
      prismaWhere.AND = value.map(mapFilterToPrisma);
      continue;
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const fieldQuery = {};
      let regexValue = null;
      let isInsensitive = false;

      for (const [op, opVal] of Object.entries(value)) {
        if (op === '$regex') { regexValue = opVal; continue; }
        if (op === '$options') { if (opVal.includes('i')) isInsensitive = true; continue; }
        if (op === '$gte') { fieldQuery.gte = opVal; continue; }
        if (op === '$lte') { fieldQuery.lte = opVal; continue; }
        if (op === '$gt')  { fieldQuery.gt  = opVal; continue; }
        if (op === '$lt')  { fieldQuery.lt  = opVal; continue; }
        if (op === '$in')  { fieldQuery.in  = opVal; continue; }
        if (op === '$ne')  { fieldQuery.not = opVal; continue; }
      }

      if (regexValue !== null) {
        fieldQuery.contains = regexValue;
        if (isInsensitive) fieldQuery.mode = 'insensitive';
      }

      prismaWhere[prismaKey] = fieldQuery;
    } else {
      prismaWhere[prismaKey] = value;
    }
  }

  return prismaWhere;
}

/**
 * Traduit un tri (style Mongoose {champ: -1}) vers un orderBy Prisma.
 */
function mapSortToPrisma(sort) {
  if (!sort || typeof sort !== 'object') return [{ created_at: 'desc' }];
  return Object.entries(sort).map(([key, val]) => ({
    [key === '_id' ? 'id' : key]: (val === -1 || val === 'desc') ? 'desc' : 'asc'
  }));
}

/**
 * Transforme les données du frontend (camelCase) vers le format base de données (snake_case)
 * et filtre les champs non supportés par le modèle Prisma pour éviter les erreurs de validation.
 */
function transformInputData(data, tableName, model = null) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(item => transformInputData(item, tableName, model));

  const transformed = {};

  // Définition des champs autorisés par table de secours
  const allowedFields = {
    departs: ['service', 'nom_depart', 'date_depart', 'date_retour', 'places_total', 'places_restantes', 'actif'],
    clients: ['nom', 'prenom', 'genre', 'telephone', 'email', 'adresse', 'ville', 'date_naissance', 
              'n_passeport', 'expiration_passeport', 'nationalite', 'vip', 'notes', 'created_by',
              'profession', 'employeur', 'quartier', 'photo_url', 'nature_passeport', 'visa_schengen',
              'visa_schengen_expiration', 'visa_usa', 'visa_usa_expiration', 'autres_visas',
              'premier_voyage', 'agence_precedente', 'nb_hajj', 'nb_oumra', 'contact_prefere',
              'source_connaissance', 'referent', 'niveau_fidelite', 'budget_estime', 'passport_url',
              'documents_urls', 'date_ajout'],
    inscriptions: ['numero', 'client_id', 'service', 'depart_id', 'formule', 'type_chambre',
                   'hotel_makkah', 'hotel_medine', 'nb_nuits_makkah', 'nb_nuits_medine', 'prix_total',
                   'acompte', 'statut_paiement', 'statut_client', 'agent_id', 'notes', 'date_inscription',
                   'date_dernier_depot'],
    paiements: ['inscription_id', 'client_id', 'montant', 'mode_paiement', 'date_paiement',
                'agent_id', 'notes', 'methode', 'reference', 'recu_numero', 'enregistre_par']
  };

  // Champs de dates qui nécessitent une conversion
  const dateFields = ['date_depart', 'date_retour', 'date_naissance', 'expiration_passeport', 
                     'visa_schengen_expiration', 'visa_usa_expiration', 'date_paiement', 
                     'date_inscription', 'date_dernier_depot', 'date_ajout', 'created_at', 'updated_at'];

  // Champs booléens
  const booleanFields = ['vip', 'actif', 'visa_schengen', 'visa_usa', 'premier_voyage', 'valide_18_mois', 'scan_conforme', 'photo_norme'];

  // Champs entiers
  const integerFields = ['nb_hajj', 'nb_oumra', 'budget_estime', 'places_total', 'places_restantes', 'nb_nuits_makkah', 'nb_nuits_medine'];

  // Champs montants / BigInt
  const numberFields = ['prix_total', 'acompte', 'montant'];

  // Déterminer la liste des champs autorisés pour ce modèle
  const targetTable = tableName || model?.name || null;
  let modelValidFields = null;
  if (model?.fields && typeof model.fields === 'object') {
    modelValidFields = Object.keys(model.fields);
  } else if (targetTable && allowedFields[targetTable]) {
    modelValidFields = allowedFields[targetTable];
  }

  for (const [key, value] of Object.entries(data)) {
    let dbKey = key;

    // Mappages spécifiques pour les départs/packages
    if (key === 'nomReference' || (targetTable === 'departs' && key === 'nom')) dbKey = 'nom_depart';
    else if (key === 'dateDepart' && targetTable === 'departs') dbKey = 'date_depart';
    else if (key === 'dateRetour' && targetTable === 'departs') dbKey = 'date_retour';
    else if (key === 'quotaMax' || (targetTable === 'departs' && key === 'placesTotal')) {
      dbKey = 'places_total';
    }
    else if (key === 'prixEco' || key === 'prix_eco') dbKey = 'prix_eco';
    else if (key === 'prixCont' || key === 'prixConfort' || key === 'prix_confort') dbKey = 'prix_confort';
    else if (key === 'prixVip' || key === 'prix_vip') dbKey = 'prix_vip';
    else if (key === 'compagnieAerienne' || (targetTable === 'departs' && key === 'compagnie')) dbKey = 'compagnie_aerienne';
    else if (key === 'numeroVol') dbKey = 'numero_vol';
    else if (key === 'villeDepart') dbKey = 'ville_depart';
    else if (key === 'villeArrivee') dbKey = 'ville_arrivee';
    else if (key === 'hotel') {
      dbKey = 'hotel';
      if (Array.isArray(value)) {
        transformed[dbKey] = value.join(', ');
        continue;
      }
    }
    else if (targetTable === 'departs' && (key === 'type' || key === 'service')) {
      dbKey = 'service';
      const t = String(value).toUpperCase();
      if (t === 'OUMRA') transformed[dbKey] = 'Oumra';
      else if (t === 'HAJJ') transformed[dbKey] = 'Hajj';
      else if (t === 'ZIYARA' || t.includes('ZIARA')) transformed[dbKey] = 'Ziara Fès';
      else transformed[dbKey] = value;
      continue;
    }
    else if (targetTable === 'departs' && key === 'statut' && (value === 'OUVERT' || value === 'COMPLET' || value === 'TERMINE' || value === 'ANNULE')) {
      dbKey = 'actif';
      transformed[dbKey] = value === 'OUVERT' || value === 'COMPLET';
      continue;
    }
    // Mappages pour les clients
    else if (key === 'numeroPasseport') dbKey = 'n_passeport';
    else if (key === 'dateExpirationPasseport') dbKey = 'expiration_passeport';
    else if (key === 'sexe') dbKey = 'genre';
    else if (key === 'dateNaissance') dbKey = 'date_naissance';
    else if (key === 'niveauFidelite') dbKey = 'niveau_fidelite';
    else if (key === 'contactPrefere') dbKey = 'contact_prefere';
    else if (key === 'sourceConnaissance') dbKey = 'source_connaissance';
    else if (key === 'premierVoyage') dbKey = 'premier_voyage';
    else if (key === 'agencePrecedente') dbKey = 'agence_precedente';
    else if (key === 'naturePasseport') dbKey = 'nature_passeport';
    else if (key === 'visaSchengen') dbKey = 'visa_schengen';
    else if (key === 'visaSchengenExpiration') dbKey = 'visa_schengen_expiration';
    else if (key === 'visaUSA' || key === 'visaUsa') dbKey = 'visa_usa';
    else if (key === 'visaUSAExpiration' || key === 'visaUsaExpiration') dbKey = 'visa_usa_expiration';
    else if (key === 'autresVisas') dbKey = 'autres_visas';
    else if (key === 'nbHajj') dbKey = 'nb_hajj';
    else if (key === 'nbOumra') dbKey = 'nb_oumra';
    else if (key === 'budgetEstime') dbKey = 'budget_estime';
    else if (key === 'passportUrl') dbKey = 'passport_url';
    else if (key === 'documentsUrls') dbKey = 'documents_urls';
    else if (key === 'dateAjout') dbKey = 'date_ajout';
    else if (key === 'photoUrl') dbKey = 'photo_url';
    else if (key === 'createdBy') dbKey = 'created_by';
    else if (key === 'createdAt') dbKey = 'created_at';
    // Mappages pour les inscriptions
    else if (key === 'statutClient') dbKey = 'statut_client';
    else if (key === 'statutPaiement') dbKey = 'statut_paiement';
    else if (key === 'montantTotalDu') dbKey = 'prix_total';
    else if (key === 'typeChambre') dbKey = 'type_chambre';
    else if (key === 'hotelMakkah') dbKey = 'hotel_makkah';
    else if (key === 'hotelMedine') dbKey = 'hotel_medine';
    else if (key === 'nbNuitsMakkah') dbKey = 'nb_nuits_makkah';
    else if (key === 'nbNuitsMedine') dbKey = 'nb_nuits_medine';
    // Mappages pour les paiements
    else if (key === 'modePaiement') dbKey = 'mode_paiement';
    else if (key === 'datePaiement') dbKey = 'date_paiement';
    else if (key === 'recuNumero') dbKey = 'recu_numero';

    // Filtrer les champs non autorisés / inconnus de Prisma
    if (modelValidFields && !modelValidFields.includes(dbKey) && dbKey !== 'id') {
      continue; // Ignorer les champs inexistants dans la table
    }

    // Transformer les champs de date
    let transformedValue = value;
    if (dateFields.includes(dbKey)) {
      if (!value || value === '') {
        transformedValue = null;
      } else if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          transformedValue = new Date(value + 'T00:00:00.000Z');
        } else if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
          transformedValue = new Date(value);
        } else {
          const parsed = new Date(value);
          transformedValue = isNaN(parsed.getTime()) ? null : parsed;
        }
      }
    } else if (booleanFields.includes(dbKey)) {
      if (value === '' || value === undefined || value === null) {
        transformedValue = null;
      } else {
        transformedValue = Boolean(value);
      }
    } else if (integerFields.includes(dbKey)) {
      if (value === '' || value === undefined || value === null) {
        transformedValue = null;
      } else {
        const parsed = parseInt(value, 10);
        transformedValue = isNaN(parsed) ? null : parsed;
      }
    } else if (numberFields.includes(dbKey)) {
      if (value === '' || value === undefined || value === null) {
        transformedValue = null;
      } else if (typeof value === 'string' || typeof value === 'number') {
        transformedValue = typeof value === 'number' ? value : (parseFloat(value) || 0);
      }
    } else if (dbKey === 'genre' && typeof value === 'string') {
      const g = value.trim().toUpperCase();
      if (g.startsWith('F') || g === 'FEMME' || g === 'FEMININ') {
        transformedValue = 'F';
      } else if (g.startsWith('M') || g.startsWith('H') || g === 'HOMME' || g === 'MASCULIN') {
        transformedValue = 'M';
      } else {
        transformedValue = null;
      }
    }

    transformed[dbKey] = transformedValue;
  }

  return transformed;
}

/**
 * Normalise un objet Prisma (ou un tableau) pour être 100% compatible
 * avec les champs attendus par le frontend legacy (Mongo / Prisma).
 */
function normalizeItem(item) {
  if (!item || typeof item !== 'object') {
    if (typeof item === 'bigint') return Number(item);
    return item;
  }
  if (Array.isArray(item)) return item.map(normalizeItem);

  const normalized = { ...item };

  // Convert all BigInt values in normalized object
  for (const key of Object.keys(normalized)) {
    if (typeof normalized[key] === 'bigint') {
      normalized[key] = Number(normalized[key]);
    }
  }

  // ID compatibility
  if (normalized.id && !normalized._id) {
    normalized._id = normalized.id;
  }

  // Client fields
  if (normalized.n_passeport && !normalized.numeroPasseport) {
    normalized.numeroPasseport = normalized.n_passeport;
  }
  if (normalized.expiration_passeport && !normalized.dateExpirationPasseport) {
    normalized.dateExpirationPasseport = normalized.expiration_passeport;
  }
  if (normalized.genre && !normalized.sexe) {
    normalized.sexe = normalized.genre;
  }
  if (normalized.date_naissance && !normalized.dateNaissance) {
    normalized.dateNaissance = normalized.date_naissance;
  }
  if (normalized.photo_url && !normalized.photoUrl) {
    normalized.photoUrl = normalized.photo_url;
  }
  if (normalized.passport_url && !normalized.passportUrl) {
    normalized.passportUrl = normalized.passport_url;
    normalized.documentPhotoUrl = normalized.passport_url;
  }
  if (normalized.numero_cni && !normalized.numeroCNI) {
    normalized.numeroCNI = normalized.numero_cni;
  }
  if (normalized.niveau_fidelite && !normalized.niveauFidelite) {
    normalized.niveauFidelite = normalized.niveau_fidelite;
  }

  // Depart / Package fields
  if (normalized.service && !normalized.type) {
    normalized.type = normalized.service.toUpperCase();
  }
  if (normalized.nom_depart && !normalized.nomReference) {
    normalized.nomReference = normalized.nom_depart;
  }
  if (normalized.nom_depart && !normalized.nom) {
    normalized.nom = normalized.nom_depart;
  }
  if (normalized.date_depart && !normalized.dateDepart) {
    normalized.dateDepart = normalized.date_depart;
  }
  if (normalized.date_retour && !normalized.dateRetour) {
    normalized.dateRetour = normalized.date_retour;
  }
  if (normalized.places_total !== undefined && normalized.quotaMax === undefined) {
    normalized.quotaMax = normalized.places_total || 30;
  }
  if (normalized.places_total !== undefined && normalized.places_restantes !== undefined) {
    normalized.placesReservees = Math.max(0, (normalized.places_total || 30) - (normalized.places_restantes || 0));
  }
  if (normalized.actif !== undefined && normalized.statut === undefined) {
    normalized.statut = normalized.actif ? 'OUVERT' : 'TERMINE';
  }
  if (normalized.prix_eco !== undefined && !normalized.prixEco) {
    normalized.prixEco = Number(normalized.prix_eco || 0);
  }
  if (normalized.prix_confort !== undefined && !normalized.prixCont) {
    normalized.prixCont = Number(normalized.prix_confort || 0);
  }
  if (normalized.prix_vip !== undefined && !normalized.prixVip) {
    normalized.prixVip = Number(normalized.prix_vip || 0);
  }
  if (normalized.compagnie_aerienne && !normalized.compagnieAerienne) {
    normalized.compagnieAerienne = normalized.compagnie_aerienne;
  }
  if (normalized.numero_vol && !normalized.numeroVol) {
    normalized.numeroVol = normalized.numero_vol;
  }
  if (normalized.ville_depart && !normalized.villeDepart) {
    normalized.villeDepart = normalized.ville_depart;
  }
  if (normalized.ville_arrivee && !normalized.villeArrivee) {
    normalized.villeArrivee = normalized.ville_arrivee;
  }
  if (normalized.billets_groupe) {
    if (normalized.billets_groupe.compagnie && !normalized.compagnieAerienne) {
      normalized.compagnieAerienne = normalized.billets_groupe.compagnie;
    }
    if (normalized.billets_groupe.num_vol_aller && !normalized.numeroVol) {
      normalized.numeroVol = normalized.billets_groupe.num_vol_aller;
    }
    if (normalized.billets_groupe.aeroport_depart && !normalized.villeDepart) {
      normalized.villeDepart = normalized.billets_groupe.aeroport_depart;
    }
  }

  // Inscription / Reservation fields
  if (normalized.prix_total !== undefined) {
    const total = Number(normalized.prix_total || 0);
    const acp = Number(normalized.acompte || 0);
    if (normalized.montantTotalDu === undefined) normalized.montantTotalDu = total;
    if (normalized.acompte === undefined || typeof normalized.acompte === 'bigint') normalized.acompte = acp;
    if (normalized.resteAPayer === undefined) normalized.resteAPayer = Math.max(0, total - acp);
  }
  if (normalized.statut_client && !normalized.statutClient) {
    normalized.statutClient = normalized.statut_client;
  }
  if (normalized.statut_paiement && !normalized.statutPaiement) {
    normalized.statutPaiement = normalized.statut_paiement;
  }

  // Relational mappings
  if (normalized.departs) {
    normalized.departs = normalizeItem(normalized.departs);
    normalized.packageKId = normalized.departs;
  } else if (normalized.depart_id && !normalized.packageKId) {
    normalized.packageKId = normalized.depart_id;
  }

  if (normalized.clients) {
    normalized.clients = normalizeItem(normalized.clients);
    if (!Array.isArray(normalized.clients)) {
      normalized.client = normalized.clients;
      normalized.clients = [normalized.clients];
    }
  }

  // Paiement fields
  if (normalized.mode_paiement && !normalized.modePaiement) {
    normalized.modePaiement = normalized.mode_paiement;
  }
  if (normalized.date_paiement && !normalized.datePaiement) {
    normalized.datePaiement = normalized.date_paiement;
  }
  if (normalized.montant !== undefined) {
    normalized.montant = Number(normalized.montant || 0);
  }
  if (normalized.inscriptions) {
    normalized.inscriptions = normalizeItem(normalized.inscriptions);
    normalized.inscription = normalized.inscriptions;
  }

  return normalized;
}

class BaseRepository {
  /**
   * @param {Object} prismaModel - Délégué Prisma (ex: prisma.clients, prisma.inscriptions)
   */
  constructor(prismaModel) {
    this.model = prismaModel;
    this.defaultInclude = null;
  }

  /**
   * Créer un enregistrement
   */
  async create(data) {
    // Nettoyage héritage Mongoose
    if (data._id && !data.id) { data.id = data._id; }
    delete data._id;
    
    // Transformation des champs camelCase vers snake_case
    // On passe this.model pour que transformInputData filtre via model.fields
    const transformedData = transformInputData(data, this.tableName, this.model);
    
    const item = await this.model.create({ data: transformedData });
    return normalizeItem(item);
  }

  /**
   * Trouver par ID (UUID Supabase)
   */
  async findById(id) {
    if (!id || typeof id !== 'string') return null;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!isUuid) return null;
    const query = { where: { id } };
    if (this.defaultInclude) query.include = this.defaultInclude;
    const item = await this.model.findUnique(query);
    return normalizeItem(item);
  }

  /**
   * Trouver un enregistrement par filtre
   */
  async findOne(filter = {}) {
    const query = { where: mapFilterToPrisma(filter) };
    if (this.defaultInclude) query.include = this.defaultInclude;
    const item = await this.model.findFirst(query);
    return normalizeItem(item);
  }

  /**
   * Trouver plusieurs enregistrements avec pagination
   * @param {Object} filter - Filtre (style Mongoose simplifié)
   * @param {Object} options - { page, limit, sort, include }
   * @returns {{ data: Array, total: number }}
   */
  async findMany(filter = {}, options = {}) {
    const { page = 1, limit = 50, sort = { created_at: -1 }, include = this.defaultInclude } = options;
    const skip = (page - 1) * limit;

    const where = mapFilterToPrisma(filter);
    const orderBy = mapSortToPrisma(sort);

    const query = { where, skip, take: limit, orderBy };
    if (include) query.include = include;

    const [rawItems, total] = await Promise.all([
      this.model.findMany(query),
      this.model.count({ where })
    ]);

    const data = rawItems.map(item => normalizeItem(item));
    return { data, total };
  }

  /**
   * Mettre à jour par ID
   */
  async updateById(id, data) {
    if (!id || typeof id !== 'string') return null;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!isUuid) return null;
    delete data._id;
    delete data.id;
    
    // Transformation + filtrage strict via les champs réels du modèle Prisma
    const transformedData = transformInputData(data, this.tableName, this.model);
    
    const item = await this.model.update({ where: { id }, data: transformedData });
    return normalizeItem(item);
  }

  /**
   * Mettre à jour le premier enregistrement correspondant au filtre
   */
  async updateOne(filter, data) {
    delete data._id;
    
    // Transformation + filtrage strict via les champs réels du modèle Prisma
    const transformedData = transformInputData(data, this.tableName, this.model);
    
    const record = await this.model.findFirst({ where: mapFilterToPrisma(filter) });
    if (!record) return null;
    const item = await this.model.update({ where: { id: record.id }, data: transformedData });
    return normalizeItem(item);
  }

  /**
   * Supprimer par ID
   */
  async deleteById(id) {
    if (!id || typeof id !== 'string') return null;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!isUuid) return null;
    return await this.model.delete({ where: { id } });
  }

  /**
   * Supprimer le premier enregistrement correspondant au filtre
   */
  async deleteOne(filter) {
    const record = await this.model.findFirst({ where: mapFilterToPrisma(filter) });
    if (!record) return null;
    return await this.model.delete({ where: { id: record.id } });
  }

  /**
   * Supprimer plusieurs enregistrements
   */
  async deleteMany(filter = {}) {
    const result = await this.model.deleteMany({ where: mapFilterToPrisma(filter) });
    return { deletedCount: result.count };
  }

  /**
   * Compter les enregistrements
   */
  async count(filter = {}) {
    return await this.model.count({ where: mapFilterToPrisma(filter) });
  }

  /**
   * Vérifier l'existence d'un enregistrement
   */
  async exists(filter) {
    const count = await this.model.count({ where: mapFilterToPrisma(filter) });
    return count > 0;
  }
}

module.exports = BaseRepository;
module.exports.mapFilterToPrisma = mapFilterToPrisma;
module.exports.mapSortToPrisma = mapSortToPrisma;
module.exports.normalizeItem = normalizeItem;
module.exports.transformInputData = transformInputData;

/**
 * @fileoverview Service pour les Clients (Supabase)
 * Couche logique métier — adaptée à la vraie table `clients`
 *
 * Correspondance champs Mongoose → Supabase :
 *   niveauFidelite  → niveau_fidelite
 *   dateNaissance   → date_naissance
 *   numeroPasseport → n_passeport
 *   creeParUtilisateurId → created_by
 */

const {
  ValidationException,
  ConflictException,
  NotFoundException,
  BusinessException,
} = require('../../../shared/exceptions');

class ClientService {
  constructor(clientRepository, auditService = null) {
    this.repository = clientRepository;
    this.auditService = auditService;
  }

  // ─────────────────────────────────────────────────────
  // CRUD DE BASE
  // ─────────────────────────────────────────────────────

  /**
   * Créer un client
   * @param {Object} data - Données client (snake_case Supabase)
   * @param {String} userId - UUID du profil agent qui crée
   */
  /**
   * Normalise les champs entrants du frontend (camelCase) → snake_case BDD
   * Supporte les deux formats : camelCase frontend et snake_case direct
   */
  normalizeClientInput(data) {
    return {
      // Identité
      nom: data.nom || null,
      prenom: data.prenom || null,
      genre: data.genre || data.sexe || null,
      telephone: data.telephone || null,
      email: data.email || null,
      adresse: data.adresse || null,
      ville: data.ville || null,
      quartier: data.quartier || null,

      // Dates (supporte les deux nommages)
      date_naissance: data.date_naissance || data.dateNaissance || null,
      
      // Passeport (supporte numeroPasseport ET n_passeport)
      n_passeport: data.n_passeport || data.numeroPasseport || null,
      expiration_passeport: data.expiration_passeport || data.dateExpirationPasseport || null,
      nationalite: data.nationalite || null,
      nature_passeport: data.nature_passeport || null,
      
      // CNI
      numero_cni: data.numero_cni || data.numeroCNI || null,

      // Fidélité (supporte niveauFidelite ET niveau_fidelite)
      niveau_fidelite: data.niveau_fidelite || data.niveauFidelite || null,
      
      // Voyages
      vip: data.vip || false,
      nb_hajj: data.nb_hajj || 0,
      nb_oumra: data.nb_oumra || 0,
      premier_voyage: data.premier_voyage !== undefined ? data.premier_voyage : null,
      
      // Pro & contact
      profession: data.profession || null,
      employeur: data.employeur || null,
      contact_prefere: data.contact_prefere || null,
      source_connaissance: data.source_connaissance || null,
      referent: data.referent || null,
      budget_estime: data.budget_estime || null,
      
      // Visas
      visa_schengen: data.visa_schengen || false,
      visa_schengen_expiration: data.visa_schengen_expiration || null,
      visa_usa: data.visa_usa || false,
      visa_usa_expiration: data.visa_usa_expiration || null,
      autres_visas: data.autres_visas || null,
      
      // Médias & docs
      photo_url: data.photo_url || data.photoUrl || null,
      passport_url: data.passport_url || data.documentPhotoUrl || null,
      documents_urls: data.documents_urls || [],
      
      // Notes
      notes: data.notes || null,
    };
  }

  async create(data, userId) {
    // Mapper camelCase → snake_case
    const normalized = this.normalizeClientInput(data);

    if (!normalized.nom) {
      const { ValidationException } = require('../../../shared/exceptions');
      throw new ValidationException('Le nom est requis');
    }

    // Vérifier email unique
    if (normalized.email && (await this.repository.emailExists(normalized.email))) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Vérifier passeport unique
    if (normalized.n_passeport && (await this.repository.passeportExists(normalized.n_passeport))) {
      throw new ConflictException(`Ce numéro de passeport (${normalized.n_passeport}) est déjà enregistré`);
    }

    // Vérifier téléphone unique
    if (normalized.telephone && (await this.repository.telephoneExists(normalized.telephone))) {
      throw new ConflictException(`Ce numéro de téléphone (${normalized.telephone}) est déjà utilisé`);
    }

    // Valeurs par défaut
    const clientData = {
      ...normalized,
      ville: normalized.ville || 'Dakar',
      nationalite: normalized.nationalite || 'Sénégalaise',
      nature_passeport: normalized.nature_passeport || 'Ordinaire',
      contact_prefere: normalized.contact_prefere || 'WhatsApp',
      niveau_fidelite: normalized.niveau_fidelite || 'Nouveau',
      premier_voyage: normalized.premier_voyage !== null ? normalized.premier_voyage : true,
      created_by: userId || null,
    };

    const client = await this.repository.create(clientData);

    if (this.auditService) {
      await this.auditService.log({
        utilisateurId: userId,
        module: 'clients',
        action: 'CREATION',
        documentId: client.id,
        details: `Création client ${client.nom} ${client.prenom || ''}`.trim(),
      });
    }

    return client;
  }

  /**
   * Récupérer tous les clients avec pagination
   */
  async getAll(filter = {}, options = {}) {
    return await this.repository.findMany(filter, options);
  }

  /**
   * Récupérer un client par ID (UUID)
   */
  async getById(id) {
    const client = await this.repository.findById(id);
    if (!client) {
      throw new NotFoundException(`Client ${id} non trouvé`);
    }
    return client;
  }

  /**
   * Récupérer un client avec ses inscriptions, visas et désistements
   */
  async getClientFull(id) {
    const client = await this.repository.getClientWithInscriptions(id);
    if (!client) {
      throw new NotFoundException(`Client ${id} non trouvé`);
    }
    return client;
  }

  /**
   * Mettre à jour un client
   */
  async update(id, data, userId) {
    const client = await this.getById(id);

    // Mapper camelCase → snake_case
    const normalized = this.normalizeClientInput(data);

    // Vérifier email unique si changé (exclude current client)
    if (normalized.email && normalized.email !== client.email) {
      if (await this.repository.emailExists(normalized.email, id)) {
        throw new ConflictException('Cet email est déjà utilisé par un autre client');
      }
    }

    // Vérifier passeport unique si changé (exclude current client)
    if (normalized.n_passeport && normalized.n_passeport !== client.n_passeport) {
      if (await this.repository.passeportExists(normalized.n_passeport, id)) {
        throw new ConflictException(`Ce numéro de passeport (${normalized.n_passeport}) est déjà enregistré`);
      }
    }

    // Vérifier téléphone unique si changé (exclude current client)
    if (normalized.telephone && normalized.telephone !== client.telephone) {
      if (await this.repository.telephoneExists(normalized.telephone, id)) {
        throw new ConflictException(`Ce numéro de téléphone (${normalized.telephone}) est déjà utilisé`);
      }
    }

    const updated = await this.repository.updateById(id, normalized);

    if (this.auditService) {
      await this.auditService.log({
        utilisateurId: userId,
        module: 'clients',
        action: 'MODIFICATION',
        documentId: id,
        details: `Modification client ${client.nom}`,
      });
    }

    return updated;
  }

  /**
   * Supprimer un client (suppression réelle — pas de soft delete dans le vrai schéma)
   */
  async delete(id, userId) {
    const client = await this.getById(id);

    const deleted = await this.repository.deleteById(id);

    if (this.auditService) {
      await this.auditService.log({
        utilisateurId: userId,
        module: 'clients',
        action: 'SUPPRESSION',
        documentId: id,
        details: `Suppression client ${client.nom}`,
      });
    }

    return deleted;
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE
  // ─────────────────────────────────────────────────────

  async search(query, options = {}) {
    if (!query || query.trim().length === 0) {
      throw new ValidationException('Terme de recherche requis');
    }
    return await this.repository.searchClients(query.trim(), options);
  }

  async getByAgent(createdBy, options = {}) {
    return await this.repository.getByCreator(createdBy);
  }

  // ─────────────────────────────────────────────────────
  // FIDÉLITÉ
  // ─────────────────────────────────────────────────────

  async promoteLoyalty(clientId) {
    const client = await this.getById(clientId);
    const levels = ['Nouveau', 'Régulier', 'Fidèle', 'VIP'];
    const currentIndex = levels.indexOf(client.niveau_fidelite);

    if (currentIndex === -1 || currentIndex === levels.length - 1) {
      throw new BusinessException('Impossible de promouvoir ce client davantage');
    }

    const nextLevel = levels[currentIndex + 1];
    return await this.repository.updateLoyaltyLevel(clientId, nextLevel);
  }

  async demoteLoyalty(clientId) {
    const client = await this.getById(clientId);
    const levels = ['Nouveau', 'Régulier', 'Fidèle', 'VIP'];
    const currentIndex = levels.indexOf(client.niveau_fidelite);

    if (currentIndex <= 0) {
      throw new BusinessException('Impossible de rétrograder ce client davantage');
    }

    const previousLevel = levels[currentIndex - 1];
    return await this.repository.updateLoyaltyLevel(clientId, previousLevel);
  }

  // ─────────────────────────────────────────────────────
  // VISAS ET DOCUMENTS
  // ─────────────────────────────────────────────────────

  /**
   * Mettre à jour les infos visa Schengen d'un client
   */
  async updateVisaSchengen(clientId, { visa_schengen, visa_schengen_expiration }) {
    await this.getById(clientId);
    return await this.repository.updateById(clientId, {
      visa_schengen: !!visa_schengen,
      visa_schengen_expiration: visa_schengen_expiration ? new Date(visa_schengen_expiration) : null,
    });
  }

  /**
   * Ajouter un document (URL) à un client
   */
  async addDocument(clientId, url) {
    await this.getById(clientId);
    return await this.repository.addDocumentUrl(clientId, url);
  }

  // ─────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────

  async getStats() {
    const [total, byLoyalty, voyageStats, newThisMonth] = await Promise.all([
      this.repository.count({}),
      this.repository.getStatsByLoyalty(),
      this.repository.getStatsByVoyageType(),
      this.repository.getNewClientsThisMonth(),
    ]);

    return {
      total,
      byLoyalty,
      ...voyageStats,
      newThisMonth: Array.isArray(newThisMonth) ? newThisMonth.length : 0,
    };
  }

  // ─────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────

  validateClientData(data, isUpdate = false) {
    if (!isUpdate) {
      if (!data.nom) {
        throw new ValidationException('Le nom est requis');
      }
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new ValidationException('Format email invalide');
    }

    if (data.date_naissance) {
      const date = new Date(data.date_naissance);
      if (isNaN(date.getTime())) {
        throw new ValidationException('Date de naissance invalide');
      }
    }
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

module.exports = ClientService;

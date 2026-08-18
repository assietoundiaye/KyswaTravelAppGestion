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
  async create(data, userId) {
    this.validateClientData(data);

    // Vérifier email unique
    if (data.email && (await this.repository.emailExists(data.email))) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Vérifier passeport unique
    if (data.n_passeport && (await this.repository.passeportExists(data.n_passeport))) {
      throw new ConflictException('Ce numéro de passeport est déjà utilisé');
    }

    // Valeurs par défaut
    const clientData = {
      nom: data.nom,
      prenom: data.prenom || null,
      genre: data.genre || null,
      telephone: data.telephone || null,
      email: data.email || null,
      adresse: data.adresse || null,
      ville: data.ville || 'Dakar',
      date_naissance: data.date_naissance ? new Date(data.date_naissance) : null,
      n_passeport: data.n_passeport || null,
      expiration_passeport: data.expiration_passeport ? new Date(data.expiration_passeport) : null,
      nationalite: data.nationalite || 'Sénégalaise',
      nature_passeport: data.nature_passeport || 'Ordinaire',
      vip: data.vip || false,
      notes: data.notes || null,
      created_by: userId || null,
      profession: data.profession || null,
      employeur: data.employeur || null,
      quartier: data.quartier || null,
      contact_prefere: data.contact_prefere || 'WhatsApp',
      source_connaissance: data.source_connaissance || null,
      referent: data.referent || null,
      niveau_fidelite: data.niveau_fidelite || 'Nouveau',
      budget_estime: data.budget_estime || null,
      premier_voyage: data.premier_voyage !== undefined ? data.premier_voyage : true,
      nb_hajj: data.nb_hajj || 0,
      nb_oumra: data.nb_oumra || 0,
      documents_urls: data.documents_urls || [],
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

    this.validateClientData(data, true);

    // Vérifier email unique si changé
    if (data.email && data.email !== client.email) {
      if (await this.repository.emailExists(data.email)) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    const updated = await this.repository.updateById(id, data);

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

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
   * Normalise le genre selon la contrainte PostgreSQL CHECK (genre IN ('M', 'F'))
   */
  normalizeGenre(raw) {
    if (!raw) return null;
    const str = String(raw).trim().toUpperCase();
    if (str.startsWith('F') || str === 'FEMME' || str === 'FEMININ') return 'F';
    if (str.startsWith('M') || str.startsWith('H') || str === 'HOMME' || str === 'MASCULIN') return 'M';
    return null;
  }

  /**
   * Normalise les champs entrants du frontend (camelCase) → snake_case BDD
   * Supporte les deux formats : camelCase frontend et snake_case direct
   */
  normalizeClientInput(data) {
    return {
      // Identité
      nom: data.nom || null,
      prenom: data.prenom || null,
      genre: this.normalizeGenre(data.genre || data.sexe),
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

  /**
   * Alertes CRM : Anniversaires et expirations de passeports
   */
  async getAlerts() {
    const clients = await this.repository.getClientsForAlerts();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexé
    const currentDay = today.getDate();

    const anniversairesAujourdhui = [];
    const anniversairesSemaine = [];
    const anniversairesMois = [];

    const passeportsExpires = [];
    const passeportsExpirantBientot = [];

    for (const client of clients) {
      // 1. Traitement Anniversaire
      if (client.date_naissance) {
        const bdate = new Date(client.date_naissance);
        if (!isNaN(bdate.getTime())) {
          const bMonth = bdate.getMonth();
          const bDay = bdate.getDate();

          // Calculer le prochain anniversaire
          let nextBirthday = new Date(currentYear, bMonth, bDay);
          nextBirthday.setHours(0, 0, 0, 0);

          let diffTime = nextBirthday.getTime() - today.getTime();
          let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          // Si l'anniversaire est passé cette année, mais qu'on est en fin d'année et l'anniv début janvier
          if (diffDays < 0 && bMonth === 0 && currentMonth === 11) {
            const nextYearBirthday = new Date(currentYear + 1, bMonth, bDay);
            diffDays = Math.round((nextYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }

          const age = currentYear - bdate.getFullYear();
          const clientData = {
            id: client.id,
            nom: client.nom,
            prenom: client.prenom,
            telephone: client.telephone,
            email: client.email,
            photo_url: client.photo_url,
            date_naissance: client.date_naissance,
            age,
            daysUntil: diffDays,
            day: bDay,
            month: bMonth + 1,
            niveau_fidelite: client.niveau_fidelite,
          };

          if (diffDays === 0) {
            anniversairesAujourdhui.push(clientData);
            anniversairesSemaine.push(clientData);
            anniversairesMois.push(clientData);
          } else if (diffDays > 0 && diffDays <= 7) {
            anniversairesSemaine.push(clientData);
            if (bMonth === currentMonth) {
              anniversairesMois.push(clientData);
            }
          } else if (bMonth === currentMonth && diffDays >= 0) {
            anniversairesMois.push(clientData);
          }
        }
      }

      // 2. Traitement Passeport
      if (client.expiration_passeport) {
        const expDate = new Date(client.expiration_passeport);
        if (!isNaN(expDate.getTime())) {
          expDate.setHours(0, 0, 0, 0);
          const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          const passData = {
            id: client.id,
            nom: client.nom,
            prenom: client.prenom,
            telephone: client.telephone,
            email: client.email,
            photo_url: client.photo_url,
            n_passeport: client.n_passeport,
            expiration_passeport: client.expiration_passeport,
            daysRemaining: diffDays,
            niveau_fidelite: client.niveau_fidelite,
          };

          if (diffDays < 0) {
            passeportsExpires.push({
              ...passData,
              statut: 'EXPIRE',
              daysExpired: Math.abs(diffDays),
            });
          } else if (diffDays <= 180) { // Moins de 6 mois
            let gravite = 'ATTENTION'; // < 6 mois (180 j)
            if (diffDays <= 30) gravite = 'CRITIQUE'; // < 1 mois
            else if (diffDays <= 90) gravite = 'URGENT'; // < 3 mois

            passeportsExpirantBientot.push({
              ...passData,
              statut: gravite,
            });
          }
        }
      }
    }

    // Tri
    anniversairesAujourdhui.sort((a, b) => a.nom.localeCompare(b.nom));
    anniversairesSemaine.sort((a, b) => a.daysUntil - b.daysUntil);
    anniversairesMois.sort((a, b) => a.daysUntil - b.daysUntil);

    passeportsExpirantBientot.sort((a, b) => a.daysRemaining - b.daysRemaining);
    passeportsExpires.sort((a, b) => a.daysExpired - b.daysExpired);

    return {
      summary: {
        totalAnniversairesAujourdhui: anniversairesAujourdhui.length,
        totalAnniversairesSemaine: anniversairesSemaine.length,
        totalAnniversairesMois: anniversairesMois.length,
        totalPasseportsExpires: passeportsExpires.length,
        totalPasseportsExpirantBientot: passeportsExpirantBientot.length,
        totalPasseportsAlertes: passeportsExpires.length + passeportsExpirantBientot.length,
      },
      anniversaires: {
        aujourdhui: anniversairesAujourdhui,
        semaine: anniversairesSemaine,
        mois: anniversairesMois,
      },
      passeports: {
        expires: passeportsExpires,
        expirantBientot: passeportsExpirantBientot,
      },
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

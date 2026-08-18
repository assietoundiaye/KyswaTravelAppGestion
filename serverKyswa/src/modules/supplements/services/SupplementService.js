/**
 * @fileoverview Service pour les suppléments
 * Logique métier et validation
 */

const { ValidationException, BusinessException } = require('../../../shared/exceptions');

class SupplementService {
  constructor(supplementRepository, auditService) {
    this.repository = supplementRepository;
    this.audit = auditService;
  }

  /**
   * Obtenir tous les suppléments avec pagination
   */
  async getSupplements(filters = {}, options = {}) {
    try {
      return await this.repository.findManyWithFilters(filters, options);
    } catch (error) {
      throw new BusinessException('Erreur lors de la récupération des suppléments', error);
    }
  }

  /**
   * Obtenir un supplément par ID
   */
  async getSupplementById(id) {
    if (!id) {
      throw new ValidationException('ID du supplément requis');
    }

    const supplement = await this.repository.findById(id);
    if (!supplement) {
      throw new BusinessException('Supplément non trouvé');
    }

    return {
      ...supplement,
      prix: parseFloat(supplement.prix)
    };
  }

  /**
   * Créer un nouveau supplément
   */
  async createSupplement(data, userId) {
    // Validation des données
    const validatedData = this.validateSupplementData(data);

    // Vérifier que le nom n'existe pas déjà
    const existing = await this.repository.findByName(validatedData.nom);
    if (existing) {
      throw new ValidationException('Un supplément avec ce nom existe déjà');
    }

    const supplement = await this.repository.create({
      ...validatedData,
      created_by: userId
    });

    // Audit
    await this.audit?.log(userId, 'CREATE', 'supplements', {
      supplementId: supplement.id,
      nom: supplement.nom,
      prix: parseFloat(supplement.prix)
    });

    return {
      ...supplement,
      prix: parseFloat(supplement.prix)
    };
  }

  /**
   * Mettre à jour un supplément
   */
  async updateSupplement(id, data, userId) {
    const supplement = await this.getSupplementById(id);
    const validatedData = this.validateSupplementData(data, false);

    // Vérifier nom unique (si changé)
    if (validatedData.nom && validatedData.nom !== supplement.nom) {
      const existing = await this.repository.findByName(validatedData.nom);
      if (existing && existing.id !== id) {
        throw new ValidationException('Un supplément avec ce nom existe déjà');
      }
    }

    const updated = await this.repository.updateById(id, validatedData);

    // Audit
    await this.audit?.log(userId, 'UPDATE', 'supplements', {
      supplementId: id,
      changes: validatedData
    });

    return {
      ...updated,
      prix: parseFloat(updated.prix)
    };
  }

  /**
   * Supprimer un supplément
   */
  async deleteSupplement(id, userId) {
    const supplement = await this.getSupplementById(id);

    // Vérifier qu'il n'est pas utilisé dans des lignes de suppléments
    const lignes = await this.repository.model.findFirst({
      where: { id },
      include: { lignes_supplements: true }
    });

    if (lignes?.lignes_supplements?.length > 0) {
      throw new BusinessException(
        'Impossible de supprimer ce supplément car il est utilisé dans des commandes'
      );
    }

    await this.repository.deleteById(id);

    // Audit
    await this.audit?.log(userId, 'DELETE', 'supplements', {
      supplementId: id,
      nom: supplement.nom
    });

    return { success: true };
  }

  /**
   * Obtenir les suppléments actifs pour les listes de sélection
   */
  async getActiveSupplements() {
    return await this.repository.findActiveSupplements();
  }

  /**
   * Validation des données de supplément
   */
  validateSupplementData(data, isCreate = true) {
    const errors = [];

    // Nom requis
    if (isCreate && !data.nom?.trim()) {
      errors.push('Le nom du supplément est requis');
    }
    if (data.nom && typeof data.nom !== 'string') {
      errors.push('Le nom doit être une chaîne de caractères');
    }

    // Prix requis et positif
    if (isCreate && (data.prix === undefined || data.prix === null)) {
      errors.push('Le prix est requis');
    }
    if (data.prix !== undefined) {
      const prix = parseFloat(data.prix);
      if (isNaN(prix) || prix < 0) {
        errors.push('Le prix doit être un nombre positif');
      }
    }

    // Description optionnelle mais limitée
    if (data.description && data.description.length > 500) {
      errors.push('La description ne peut pas dépasser 500 caractères');
    }

    // Actif doit être booléen
    if (data.actif !== undefined && typeof data.actif !== 'boolean') {
      errors.push('Le statut actif doit être vrai ou faux');
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.join(', '));
    }

    const validated = {};
    if (data.nom) validated.nom = data.nom.trim();
    if (data.prix !== undefined) validated.prix = parseFloat(data.prix);
    if (data.description !== undefined) validated.description = data.description?.trim() || null;
    if (data.actif !== undefined) validated.actif = data.actif;

    return validated;
  }
}

module.exports = SupplementService;
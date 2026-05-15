#!/usr/bin/env node

/**
 * @fileoverview Générateur de modules
 * Usage: node scripts/generate-module.js clients
 * Crée une structure complète de module
 */

const fs = require('fs');
const path = require('path');

const moduleName = process.argv[2];

if (!moduleName) {
  console.error('❌ Usage: node scripts/generate-module.js <moduleName>');
  process.exit(1);
}

const modulePath = path.join(__dirname, `../src/modules/${moduleName}`);

// Vérifier si le module existe
if (fs.existsSync(modulePath)) {
  console.error(`❌ Le module "${moduleName}" existe déjà`);
  process.exit(1);
}

// Templates
const templates = {
  repository: (name) => `/**
 * @fileoverview Repository pour le module ${name}
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');

class ${capitalize(name)}Repository extends BaseRepository {
  constructor(model) {
    super(model);
  }

  // Ajouter vos méthodes personnalisées ici
}

module.exports = ${capitalize(name)}Repository;
`,

  service: (name) => `/**
 * @fileoverview Service métier pour ${name}
 */

const { NotFoundException } = require('../../../shared/exceptions');

class ${capitalize(name)}Service {
  constructor(${name}Repository) {
    this.repository = ${name}Repository;
  }

  /**
   * Créer un ${name}
   */
  async create(data) {
    // Logique métier
    return await this.repository.create(data);
  }

  /**
   * Récupérer tous les ${name}s
   */
  async getAll(filter = {}, options = {}) {
    return await this.repository.findMany(filter, options);
  }

  /**
   * Récupérer un ${name} par ID
   */
  async getById(id) {
    const ${name.slice(0, -1)} = await this.repository.findById(id);
    if (!${name.slice(0, -1)}) {
      throw new NotFoundException('${capitalize(name.slice(0, -1))} non trouvé');
    }
    return ${name.slice(0, -1)};
  }

  /**
   * Mettre à jour un ${name}
   */
  async update(id, data) {
    return await this.repository.updateById(id, data);
  }

  /**
   * Supprimer un ${name}
   */
  async delete(id) {
    return await this.repository.deleteById(id);
  }
}

module.exports = ${capitalize(name)}Service;
`,

  controller: (name) => `/**
 * @fileoverview Contrôleur pour ${name}
 */

class ${capitalize(name)}Controller {
  constructor(${name}Service) {
    this.service = ${name}Service;
  }

  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const data = await this.service.getAll({}, { page: parseInt(page), limit: parseInt(limit) });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const ${name.slice(0, -1)} = await this.service.getById(req.params.id);
      res.status(200).json({ success: true, data: ${name.slice(0, -1)} });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const ${name.slice(0, -1)} = await this.service.create(req.body);
      res.status(201).json({ success: true, data: ${name.slice(0, -1)}, message: 'Créé avec succès' });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const ${name.slice(0, -1)} = await this.service.update(req.params.id, req.body);
      res.status(200).json({ success: true, data: ${name.slice(0, -1)}, message: 'Mis à jour avec succès' });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.service.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Supprimé avec succès' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ${capitalize(name)}Controller;
`,

  routes: (name) => `/**
 * @fileoverview Routes pour ${name}
 */

const express = require('express');
const ${capitalize(name)}Controller = require('../controllers/${capitalize(name)}Controller');
const ${capitalize(name)}Repository = require('../repositories/${capitalize(name)}Repository');
const ${capitalize(name)}Service = require('../services/${capitalize(name)}Service');
const { protect, requireRole } = require('../../../core/middleware/auth');

function create${capitalize(name)}Routes(dependencies) {
  const { ${name}Model } = dependencies;
  const router = express.Router();

  // Initialiser les dépendances
  const repository = new ${capitalize(name)}Repository(${name}Model);
  const service = new ${capitalize(name)}Service(repository);
  const controller = new ${capitalize(name)}Controller(service);

  // Routes CRUD
  router.get('/', protect, (req, res, next) => controller.getAll(req, res, next));
  router.get('/:id', protect, (req, res, next) => controller.getById(req, res, next));
  router.post('/', protect, (req, res, next) => controller.create(req, res, next));
  router.patch('/:id', protect, (req, res, next) => controller.update(req, res, next));
  router.delete('/:id', protect, (req, res, next) => controller.delete(req, res, next));

  return router;
}

module.exports = create${capitalize(name)}Routes;
`,

  index: (name) => `/**
 * @fileoverview Module ${name}
 */

module.exports = {
  routes: require('./routes'),
};
`,
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Créer les dossiers
const dirs = [
  'controllers',
  'services',
  'repositories',
  'schemas',
];

console.log(`\n📁 Création du module "${moduleName}"...`);

dirs.forEach((dir) => {
  const dirPath = path.join(modulePath, dir);
  fs.mkdirSync(dirPath, { recursive: true });
  console.log(`  ✓ ${dir}/`);
});

// Créer les fichiers
Object.entries(templates).forEach(([type, template]) => {
  const filePath = path.join(modulePath, type === 'routes' ? 'routes.js' : `${type}s/${capitalize(moduleName)}${capitalize(type)}.js`);
  const content = template(moduleName);
  fs.writeFileSync(filePath, content);
  console.log(`  ✓ ${path.relative(modulePath, filePath)}`);
});

// Créer index.js
fs.writeFileSync(path.join(modulePath, 'index.js'), templates.index(moduleName));
console.log(`  ✓ index.js`);

console.log(`\n✅ Module "${moduleName}" créé avec succès!\n`);
console.log('📝 Prochaines étapes:');
console.log(`  1. Ajouter le modèle à src/database/models/${capitalize(moduleName)}.js`);
console.log(`  2. Adapter les méthodes dans le repository`);
console.log(`  3. Ajouter la logique métier dans le service`);
console.log(`  4. Charger le module dans src/app.js\n`);

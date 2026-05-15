#!/usr/bin/env node

/**
 * @fileoverview Script: Générer template module complet
 * 
 * Utilisation:
 *   node scripts/generate-full-module.js reservations
 *   node scripts/generate-full-module.js paiements
 *   
 * Génère tous les fichiers pour un nouveau module
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────

const moduleName = process.argv[2];

if (!moduleName) {
  console.error('❌ Usage: node scripts/generate-full-module.js <moduleName>');
  process.exit(1);
}

const baseDir = path.join(__dirname, '../src/modules', moduleName);

// ─────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────

const templates = {
  repository: (name) => `/**
 * @fileoverview Repository pour les ${name}s
 * Couche accès données
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');

class ${name}Repository extends BaseRepository {
  constructor(model) {
    super(model);
  }

  // Ajouter ici les méthodes spécifiques au domaine
  // Exemple:
  // async findByReference(reference) {
  //   return this.findOne({ reference });
  // }

  // async getStats() {
  //   return this.model.aggregate([...]);
  // }
}

module.exports = ${name}Repository;
`,

  service: (name) => `/**
 * @fileoverview Service pour les ${name}s
 * Couche logique métier
 */

const {
  ValidationException,
  ConflictException,
  NotFoundException,
  BusinessException,
} = require('../../../shared/exceptions');

class ${name}Service {
  constructor(repository, auditService = null) {
    this.repository = repository;
    this.auditService = auditService;
  }

  // CRUD DE BASE

  async create(data, userId) {
    // Validation
    // this.validate${name}Data(data);

    // Vérifier conflits (exemple)
    // if (await this.repository.exists()) throw new ConflictException();

    // Créer
    const item = await this.repository.create(data);

    // Auditer
    if (this.auditService) {
      await this.auditService.log({
        utilisateurId: userId,
        module: '${moduleName}',
        action: 'CREATION',
        documentId: item._id,
      });
    }

    return item;
  }

  async getById(id) {
    const item = await this.repository.findById(id);
    if (!item) throw new NotFoundException(\`${name} \${id} non trouvé\`);
    return item;
  }

  async getAll(filter = {}, options = {}) {
    return await this.repository.findMany(filter, options);
  }

  async update(id, data, userId) {
    await this.getById(id); // Vérifie existence
    
    const updated = await this.repository.updateById(id, data);

    if (this.auditService) {
      await this.auditService.log({
        utilisateurId: userId,
        module: '${moduleName}',
        action: 'MODIFICATION',
        documentId: id,
      });
    }

    return updated;
  }

  async delete(id, userId) {
    await this.getById(id);
    
    const deleted = await this.repository.softDelete(id);

    if (this.auditService) {
      await this.auditService.log({
        utilisateurId: userId,
        module: '${moduleName}',
        action: 'SUPPRESSION',
        documentId: id,
      });
    }

    return deleted;
  }

  // VALIDATION

  validate${name}Data(data, isUpdate = false) {
    // Ajouter validation métier spécifique
  }
}

module.exports = ${name}Service;
`,

  controller: (name) => `/**
 * @fileoverview Controller pour les ${name}s
 * Gère les requêtes HTTP
 */

class ${name}Controller {
  constructor(service) {
    this.service = service;
  }

  // CRUD DE BASE

  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.service.getAll({}, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const item = await this.service.getById(req.params.id);
      res.status(200).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const item = await this.service.create(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: item,
        message: '${name} créé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const item = await this.service.update(req.params.id, req.body, req.user.id);
      res.status(200).json({
        success: true,
        data: item,
        message: '${name} mis à jour',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.service.delete(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: '${name} supprimé' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ${name}Controller;
`,

  routes: (name, moduleName) => `/**
 * @fileoverview Routes pour les ${name}s
 * Injection de dépendances
 */

const express = require('express');
const ${name}Controller = require('../controllers/${name}Controller');
const ${name}Repository = require('../repositories/${name}Repository');
const ${name}Service = require('../services/${name}Service');
const { protect, requireRole } = require('../../../core/middleware/auth');

function create${name}Routes(dependencies) {
  const { ${moduleName}Model, auditService } = dependencies;
  const router = express.Router();

  // INJECTION DE DÉPENDANCES
  const repository = new ${name}Repository(${moduleName}Model);
  const service = new ${name}Service(repository, auditService);
  const controller = new ${name}Controller(service);

  // ROUTES
  router.get('/', protect, (req, res, next) => 
    controller.getAll(req, res, next)
  );

  router.get('/:id', protect, (req, res, next) => 
    controller.getById(req, res, next)
  );

  router.post('/', protect, (req, res, next) => 
    controller.create(req, res, next)
  );

  router.patch('/:id', protect, (req, res, next) => 
    controller.update(req, res, next)
  );

  router.delete('/:id', protect, requireRole('administrateur', 'dg'), (req, res, next) => 
    controller.delete(req, res, next)
  );

  return router;
}

module.exports = create${name}Routes;
`,

  test: (name) => `/**
 * @fileoverview Tests pour ${name}Service
 */

const ${name}Service = require('../../../src/modules/${moduleName}/services/${name}Service');
const {
  ConflictException,
  NotFoundException,
  ValidationException,
} = require('../../../src/shared/exceptions');

describe('${name}Service', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      updateById: jest.fn(),
      softDelete: jest.fn(),
    };

    service = new ${name}Service(mockRepository);
  });

  describe('create', () => {
    test('should create item', async () => {
      const data = { /* données test */ };
      const result = { _id: '1', ...data };

      mockRepository.create.mockResolvedValue(result);

      const res = await service.create(data, 'userId');
      expect(res._id).toBe('1');
    });
  });

  describe('getById', () => {
    test('should return item by ID', async () => {
      const mockItem = { _id: '1', name: 'Test' };
      mockRepository.findById.mockResolvedValue(mockItem);

      const res = await service.getById('1');
      expect(res).toEqual(mockItem);
    });

    test('should throw if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getById('1')).rejects.toThrow(NotFoundException);
    });
  });
});
`,

  readme: (name, moduleName) => `# Module ${name.charAt(0).toUpperCase() + name.slice(1)}

## Description
Ce module gère les ${name}s du système Kyswa Travel.

## Structure

\`\`\`
${moduleName}/
├── controllers/
│   └── ${name}Controller.js      - Gestion HTTP
├── services/
│   └── ${name}Service.js         - Logique métier
├── repositories/
│   └── ${name}Repository.js      - Accès BD
└── routes.js                     - Routes + DI
\`\`\`

## Endpoints

### GET /api/${moduleName}
Récupérer tous les ${name}s

**Query Parameters:**
- \`page\`: Page (default: 1)
- \`limit\`: Items par page (default: 20)

\`\`\`bash
curl http://localhost:5000/api/${moduleName} \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### GET /api/${moduleName}/:id
Récupérer un ${name}

### POST /api/${moduleName}
Créer un ${name}

\`\`\`bash
curl -X POST http://localhost:5000/api/${moduleName} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{ /* données */ }'
\`\`\`

### PATCH /api/${moduleName}/:id
Mettre à jour un ${name}

### DELETE /api/${moduleName}/:id
Supprimer un ${name}

## Tests

\`\`\`bash
npm test -- tests/modules/${moduleName}/
\`\`\`

## Intégration

Pour intégrer ce module, voir [GUIDE-INTEGRATION-MODULES.md](../../GUIDE-INTEGRATION-MODULES.md)
`,
};

// ─────────────────────────────────────────────────────
// GÉNÉRATION
// ─────────────────────────────────────────────────────

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function createFile(filePath, content) {
  const dir = path.dirname(filePath);

  // Créer les répertoires
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Créer le fichier
  fs.writeFileSync(filePath, content);
  console.log(`  ✓ ${path.relative(baseDir, filePath)}`);
}

async function generate() {
  console.log(`\n📦 Génération module: ${moduleName}\n`);

  const capitalizedName = capitalize(moduleName.slice(0, -1)); // Singulier
  const modelName = capitalize(moduleName.split('-').join(''));

  try {
    // Repository
    createFile(
      path.join(baseDir, 'repositories', `${capitalizedName}Repository.js`),
      templates.repository(capitalizedName)
    );

    // Service
    createFile(
      path.join(baseDir, 'services', `${capitalizedName}Service.js`),
      templates.service(capitalizedName)
    );

    // Controller
    createFile(
      path.join(baseDir, 'controllers', `${capitalizedName}Controller.js`),
      templates.controller(capitalizedName)
    );

    // Routes
    createFile(
      path.join(baseDir, 'routes.js'),
      templates.routes(capitalizedName, moduleName)
    );

    // Tests
    createFile(
      path.join(__dirname, '../tests/modules', moduleName, `${capitalizedName}Service.test.js`),
      templates.test(capitalizedName)
    );

    // README
    createFile(
      path.join(baseDir, 'README.md'),
      templates.readme(capitalizedName, moduleName)
    );

    console.log(`\n✅ Module généré avec succès!\n`);
    console.log(`📝 Prochaines étapes:`);
    console.log(`   1. Éditer src/modules/${moduleName}/repositories/${capitalizedName}Repository.js`);
    console.log(`   2. Ajouter la logique métier dans services/${capitalizedName}Service.js`);
    console.log(`   3. Mettre à jour database/models/${modelName}.js`);
    console.log(`   4. Ajouter dans src/app.js → setupRoutes()`);
    console.log(`   5. Tester avec npm test\n`);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

generate();

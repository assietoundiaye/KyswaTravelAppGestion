#!/usr/bin/env node

/**
 * @fileoverview Guide interactif de migration
 * Aide à migrer de l'ancien code vers la nouvelle architecture
 * 
 * Usage: node scripts/migrate-module-interactive.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.clear();
  console.log(`
╔════════════════════════════════════════════════════╗
║   🔄 GUIDE DE MIGRATION — Kyswa Travel            ║
║                                                    ║
║   Aide-mémoire pour migrer de l'ancien code       ║
║   vers la nouvelle architecture modulaire         ║
╚════════════════════════════════════════════════════╝
  `);

  console.log('\n📚 ÉTAPES DE MIGRATION POUR UN MODULE\n');
  console.log('Exemple: Migration du module "clients"\n');

  const steps = [
    {
      num: 1,
      title: 'Créer le repository',
      details: `
✅ Copier la logique d'accès BD
   
   Avant:
   └── routes/clients.js (contient les .find(), .save(), etc.)
   
   Après:
   └── src/modules/clients/repositories/ClientRepository.js
   
   class ClientRepository extends BaseRepository {
     async findByEmail(email) { return this.findOne({ email }); }
     async findByPasseport(numero) { ... }
   }
      `,
      file: 'src/modules/clients/repositories/ClientRepository.js',
    },

    {
      num: 2,
      title: 'Créer le service',
      details: `
✅ Déplacer la logique métier
   
   Avant:
   └── routes/clients.js (validation + calculs + appels DB)
   
   Après:
   └── src/modules/clients/services/ClientService.js
   
   class ClientService {
     async create(data) {
       // Validation métier
       if (await this.repo.emailExists(data.email)) {
         throw new ConflictException('Email déjà utilisé');
       }
       // Logique
       return await this.repo.create(data);
     }
   }
      `,
      file: 'src/modules/clients/services/ClientService.js',
    },

    {
      num: 3,
      title: 'Refactoriser le controller',
      details: `
✅ Garder juste la gestion HTTP
   
   Avant:
   └── routes/clients.js (500+ lignes avec tout)
   
   Après:
   └── src/modules/clients/controllers/ClientController.js
   
   class ClientController {
     async create(req, res, next) {
       try {
         const client = await this.service.create(req.body);
         res.status(201).json(client);
       } catch (error) {
         next(error); // Error handler centralisé
       }
     }
   }
      `,
      file: 'src/modules/clients/controllers/ClientController.js',
    },

    {
      num: 4,
      title: 'Créer les routes',
      details: `
✅ Routes avec injection de dépendances
   
   src/modules/clients/routes.js
   
   function createClientRoutes(dependencies) {
     const { clientModel } = dependencies;
     const repository = new ClientRepository(clientModel);
     const service = new ClientService(repository);
     const controller = new ClientController(service);
     
     const router = express.Router();
     router.post('/', (req, res, next) => controller.create(req, res, next));
     return router;
   }
      `,
      file: 'src/modules/clients/routes.js',
    },

    {
      num: 5,
      title: 'Charger dans app.js',
      details: `
✅ Enregistrer le module
   
   src/app.js
   
   setupRoutes(dependencies) {
     const createClientRoutes = require('../modules/clients/routes');
     this.app.use('/api/clients', createClientRoutes(dependencies));
   }
      `,
      file: 'src/app.js',
    },

    {
      num: 6,
      title: 'Tester',
      details: `
✅ Valider l'intégration
   
   tests/modules/clients/ClientService.test.js
   
   describe('ClientService', () => {
     test('should throw if email exists', async () => {
       repository.emailExists.mockResolvedValue(true);
       await expect(service.create(...))
         .rejects.toThrow(ConflictException);
     });
   });
      `,
      file: 'tests/modules/clients/ClientService.test.js',
    },
  ];

  let continuer = true;
  let stepIndex = 0;

  while (continuer && stepIndex < steps.length) {
    const step = steps[stepIndex];

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`\n📍 ÉTAPE ${step.num}/6 : ${step.title}\n`);
    console.log(step.details);
    console.log(`\n📝 Fichier: ${step.file}`);
    console.log(`\n${'═'.repeat(50)}\n`);

    const choice = await question(
      '  (n)ext, (s)auter, (q)uitter, (aller à)... ? → '
    );

    if (choice.toLowerCase() === 'q') {
      continuer = false;
    } else if (choice.toLowerCase() === 's') {
      stepIndex++;
    } else if (choice.toLowerCase() === 'n') {
      stepIndex++;
    } else if (choice.toLowerCase() === 'a') {
      const newStep = await question('  Aller à l\'étape: ');
      stepIndex = parseInt(newStep) - 1;
      if (isNaN(stepIndex) || stepIndex < 0 || stepIndex >= steps.length) {
        console.log('  ❌ Étape invalide');
        stepIndex = 0;
      }
    } else {
      console.log('  ❓ Commande non reconnue');
    }
  }

  console.log(`\n
╔════════════════════════════════════════════════════╗
║   ✅ MIGRATION COMPLETE                           ║
║                                                    ║
║   Prochaines étapes:                              ║
║   1. Tester les routes API                        ║
║   2. Valider les tests                            ║
║   3. Passer au module suivant                     ║
║   4. Supprimer l'ancien code                      ║
╚════════════════════════════════════════════════════╝
  `);

  rl.close();
}

main();

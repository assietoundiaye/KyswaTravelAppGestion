/**
 * Tests des modules de la nouvelle architecture modulaire (PostgreSQL / Prisma)
 */
const prisma = require('../src/database/client');
const ClientService = require('../src/modules/clients/services/ClientService');
const ClientRepository = require('../src/modules/clients/repositories/ClientRepository');

describe('Modular Architecture — Tests PostgreSQL & Prisma', () => {
  let clientService;
  let clientRepo;

  beforeAll(() => {
    clientRepo = new ClientRepository();
    clientService = new ClientService({ repository: clientRepo });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('ClientService — Normalisation & Validation', () => {
    it('devrait normaliser les champs camelCase en snake_case', () => {
      const input = {
        nom: 'DIENG',
        prenom: 'Moussa',
        numeroPasseport: 'A12345678',
        dateExpirationPasseport: '2030-05-15',
        dateNaissance: '1995-03-22',
        sexe: 'M',
        niveauFidelite: 'PLATINE',
      };

      const normalized = clientService.normalizeClientInput(input);

      expect(normalized.nom).toBe('DIENG');
      expect(normalized.prenom).toBe('Moussa');
      expect(normalized.n_passeport).toBe('A12345678');
      expect(normalized.expiration_passeport).toBe('2030-05-15');
      expect(normalized.date_naissance).toBe('1995-03-22');
      expect(normalized.genre).toBe('M');
      expect(normalized.niveau_fidelite).toBe('PLATINE');
    });

    it('devrait accepter les clés snake_case déjà existantes', () => {
      const input = {
        nom: 'FALL',
        prenom: 'Fatou',
        n_passeport: 'B98765432',
        expiration_passeport: '2031-01-01',
      };

      const normalized = clientService.normalizeClientInput(input);

      expect(normalized.n_passeport).toBe('B98765432');
      expect(normalized.expiration_passeport).toBe('2031-01-01');
    });
  });

  describe('PostgreSQL Connectivity & Pagination', () => {
    it('devrait pouvoir lire la table clients avec pagination', async () => {
      const result = await clientRepo.findMany({}, { page: 1, limit: 10 });
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.total).toBe('number');
      expect(result.data.length).toBeLessThanOrEqual(10);
    });

    it('devrait pouvoir lire les profiles', async () => {
      const count = await prisma.profiles.count();
      expect(typeof count).toBe('number');
    });
  });
});

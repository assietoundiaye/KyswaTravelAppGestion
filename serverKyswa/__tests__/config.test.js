/**
 * Test de configuration - Valide que l'environnement de test fonctionne
 */

const { prisma } = require('./setup-postgresql');

describe('Configuration Tests PostgreSQL', () => {
  it('devrait se connecter à la base de test', async () => {
    expect(prisma).toBeDefined();
    
    // Test de connexion simple
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result[0].test).toBe(1);
  });
  
  it('devrait utiliser PostgreSQL', async () => {
    const result = await prisma.$queryRaw`SELECT version()`;
    expect(result[0].version).toContain('PostgreSQL');
  });
  
  it('devrait pouvoir compter les profiles', async () => {
    const count = await prisma.profiles.count();
    expect(typeof count).toBe('number');
  });
});

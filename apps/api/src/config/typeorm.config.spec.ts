describe('typeOrmConfig', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    jest.resetModules();
  });

  it.each([
    ['DATABASE_URL configuration', 'postgres://test:test@localhost:5432/akit_test'],
    ['host configuration', undefined],
  ])('runs migrations individually for %s', async (_name, databaseUrl) => {
    if (databaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = databaseUrl;
    }

    const { typeOrmConfig } = await import('./typeorm.config.js');

    expect(typeOrmConfig.migrationsTransactionMode).toBe('each');
  });
});

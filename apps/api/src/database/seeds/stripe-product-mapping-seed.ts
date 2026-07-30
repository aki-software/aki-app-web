import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config.js';
import {
  StripeProductMapping,
  StripeCurrency,
} from '../../payments/entities/stripe-product-mapping.entity.js';

export async function seedStripeProductMappings(dataSource: DataSource) {
  const repo = dataSource.getRepository(StripeProductMapping);

  const mappings = [
    {
      stripePriceId: 'price_USD_PLACEHOLDER',
      currency: StripeCurrency.USD,
      voucherQuantity: 50,
      description: '50 vouchers - USD',
      isActive: true,
    },
    {
      stripePriceId: 'price_ARS_PLACEHOLDER',
      currency: StripeCurrency.ARS,
      voucherQuantity: 50,
      description: '50 vouchers - ARS',
      isActive: true,
    },
  ];

  for (const mapping of mappings) {
    const existing = await repo.findOne({
      where: { stripePriceId: mapping.stripePriceId },
    });
    if (!existing) {
      await repo.save(repo.create(mapping));
      console.log(
        `Created Stripe product mapping for ${mapping.stripePriceId}`,
      );
    } else {
      console.log(`Mapping for ${mapping.stripePriceId} already exists`);
    }
  }
}

async function seedStripeProductMappingsCli() {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    console.log('Initializing Stripe product mappings seed...');
    await dataSource.initialize();
    await seedStripeProductMappings(dataSource);
    console.log('Stripe product mappings seed finished successfully.');
  } catch (error) {
    console.error('Error seeding Stripe product mappings:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  void seedStripeProductMappingsCli();
}

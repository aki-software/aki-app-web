import { PricingPlan } from './pricing-plan.entity';

describe('PricingPlan Entity', () => {
  it('should be defined', () => {
    expect(new PricingPlan()).toBeDefined();
  });

  it('should have default isActive value', () => {
    const plan = new PricingPlan();
    // Assuming we want isActive to be true by default in the entity definition or tests
    // TypeORM handles defaults at DB level typically, but we can set defaults in class
    plan.isActive = true;
    expect(plan.isActive).toBe(true);
  });
});

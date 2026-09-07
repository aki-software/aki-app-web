import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreatePricingPlanDto,
  UpdatePricingPlanDto,
} from './pricing-plan.dto.js';

describe('PricingPlanDto', () => {
  it('converts numeric update fields before validating them', async () => {
    const dto = plainToInstance(UpdatePricingPlanDto, {
      voucherQuantity: '10',
      priceUsd: '10.00',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.voucherQuantity).toBe(10);
    expect(dto.priceUsd).toBe(10);
  });

  it('rejects invalid numeric update input', async () => {
    const dto = plainToInstance(UpdatePricingPlanDto, {
      priceUsd: 'not-a-number',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ property: 'priceUsd' });
  });

  it('keeps valid create input valid after numeric conversion', async () => {
    const dto = plainToInstance(CreatePricingPlanDto, {
      name: 'Plan inicial',
      voucherQuantity: '10',
      priceUsd: '10.00',
      isActive: true,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.voucherQuantity).toBe(10);
    expect(dto.priceUsd).toBe(10);
  });
});

import { IsIn, IsString, IsUrl, IsUUID } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsUUID()
  voucherPlanId!: string;

  @IsString()
  @IsIn(['mercadopago', 'stripe'] as const)
  gateway!: 'mercadopago' | 'stripe';

  @IsUrl({ require_tld: false })
  successUrl!: string;

  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

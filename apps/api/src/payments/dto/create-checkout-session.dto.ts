import { IsString, IsUrl } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  stripePriceId!: string;

  @IsUrl({ require_tld: false })
  successUrl!: string;

  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CheckoutRequestDto {
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsString()
  @IsNotEmpty()
  gateway!: 'MERCADO_PAGO' | 'STRIPE';

  @IsString()
  @IsOptional()
  successUrl?: string;

  @IsString()
  @IsOptional()
  failureUrl?: string;
}

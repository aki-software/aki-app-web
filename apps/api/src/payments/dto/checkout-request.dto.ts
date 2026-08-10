import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class CheckoutRequestDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 128)
  planId!: string;

  @IsEnum(['MERCADO_PAGO', 'STRIPE'])
  gateway!: 'MERCADO_PAGO' | 'STRIPE';

  @IsString()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Length(1, 2048)
  successUrl?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Length(1, 2048)
  failureUrl?: string;
}

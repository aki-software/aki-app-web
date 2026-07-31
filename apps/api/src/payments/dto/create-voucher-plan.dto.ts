import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateVoucherPlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  priceArs!: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  priceUsd?: number;

  @IsInt()
  @Min(1)
  voucherQuantity!: number;

  @IsOptional()
  @IsBoolean()
  isSubscription?: boolean;

  @IsOptional()
  @IsString()
  billingCycle?: string;
}

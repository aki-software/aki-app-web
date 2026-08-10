import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreatePricingPlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  voucherQuantity!: number;

  @IsNumber()
  @IsNotEmpty()
  priceUsd!: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePricingPlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  voucherQuantity?: number;

  @IsNumber()
  @IsOptional()
  priceUsd?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

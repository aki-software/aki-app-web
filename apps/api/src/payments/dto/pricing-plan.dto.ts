import { Type } from 'class-transformer';
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

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  voucherQuantity!: number;

  @Type(() => Number)
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

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  voucherQuantity?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  priceUsd?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

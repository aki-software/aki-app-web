import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateBillingProfileDto {
  @IsString()
  @IsNotEmpty()
  legalName!: string;

  @IsString()
  @IsNotEmpty()
  taxId!: string;

  @IsString()
  @IsNotEmpty()
  taxCondition!: string;

  @IsString()
  @IsNotEmpty()
  billingAddress!: string;
}

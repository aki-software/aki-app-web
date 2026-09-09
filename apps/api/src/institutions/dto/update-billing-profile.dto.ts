import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateBillingProfileDto {
  @IsString()
  @IsNotEmpty()
  legalName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}-?\d{8}-?\d{1}$/, {
    message:
      'El CUIT debe tener 11 dígitos, con o sin guiones (ej: 20-12345678-9).',
  })
  taxId!: string;

  @IsString()
  @IsNotEmpty()
  taxCondition!: string;

  @IsString()
  @IsNotEmpty()
  billingAddress!: string;

  @IsString()
  @IsNotEmpty()
  billingCity!: string;

  @IsString()
  @IsNotEmpty()
  billingProvince!: string;

  @IsString()
  @IsNotEmpty()
  billingPhone!: string;
}

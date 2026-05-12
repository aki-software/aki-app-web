import { IsOptional, IsString, Matches } from 'class-validator';

export class VoucherCodeOptionalDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{8}$/)
  code?: string;
}

import {
  IsEmail,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherOwnerType } from '../entities/voucher.enums';

export class CreateVoucherDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{8}$/)
  code?: string;

  @IsEnum(VoucherOwnerType)
  ownerType?: VoucherOwnerType;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string | null;

  @IsOptional()
  @IsUUID()
  ownerInstitutionId?: string | null;

  @IsOptional()
  @IsString()
  assignedPatientName?: string;

  @IsOptional()
  @IsEmail()
  assignedPatientEmail?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherOwnerType } from '../entities/voucher.enums';

export class CreateVoucherDto {
  @IsOptional()
  @IsString()
  @Length(4, 12)
  code?: string;

  @IsEnum(VoucherOwnerType)
  ownerType: VoucherOwnerType;

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
  @IsString()
  expiresAt?: string;
}

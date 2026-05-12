import {
  IsEmail,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherOwnerType } from '../entities/voucher.enums';
import { VoucherCodeOptionalDto } from './shared/voucher-code-optional.dto';

export class CreateVoucherDto extends VoucherCodeOptionalDto {
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

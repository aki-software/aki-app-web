import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { VoucherOwnerType, VoucherStatus } from '../entities/voucher.enums.js';
import { VoucherExpirationFilter } from '../vouchers.constants.js';

/**
 * Base for DTOs that require or optionally include a voucher code.
 */
export class VoucherCodeBaseDto {
  @IsString()
  @Matches(/^[A-Za-z0-9]{8}$/)
  code!: string;
}

export class VoucherCodeOptionalDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{8}$/)
  code?: string;
}

/**
 * Base for listing/pagination DTOs.
 */
export class VoucherPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class VoucherSearchDto extends VoucherPaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(VoucherExpirationFilter)
  expiration?: VoucherExpirationFilter;
}

/**
 * Actions DTOs
 */
export class CreateVoucherDto extends VoucherCodeOptionalDto {
  @IsEnum(VoucherOwnerType)
  ownerType!: VoucherOwnerType;

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

export class RedeemVoucherDto extends VoucherCodeBaseDto {
  @IsUUID('all')
  sessionId!: string;
}

export class ResolveVoucherDto extends VoucherCodeBaseDto {}

export class SendVoucherEmailDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}

/**
 * Query DTOs
 */
export class ListVouchersDto extends VoucherSearchDto {
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;
}

export class ListVoucherBatchesDto extends VoucherSearchDto {}

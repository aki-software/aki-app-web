import { PartialType } from '@nestjs/mapped-types';
import { CreateVoucherPlanDto } from './create-voucher-plan.dto.js';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateVoucherPlanDto extends PartialType(CreateVoucherPlanDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

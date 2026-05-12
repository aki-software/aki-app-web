import { IsUUID } from 'class-validator';
import { VoucherCodeDto } from './shared/voucher-code.dto';

export class RedeemVoucherDto extends VoucherCodeDto {
  @IsUUID('all')
  sessionId!: string;
}

import { IsString, IsUUID, Matches } from 'class-validator';

export class RedeemVoucherDto {
  @IsString()
  @Matches(/^[A-Za-z0-9]{8}$/)
  code: string;

  @IsUUID('all')
  sessionId: string;
}

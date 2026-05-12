import { IsString, Matches } from 'class-validator';

export class VoucherCodeDto {
  @IsString()
  @Matches(/^[A-Za-z0-9]{8}$/)
  code!: string;
}

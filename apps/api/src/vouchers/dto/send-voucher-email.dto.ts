import { IsEmail, IsOptional } from 'class-validator';

export class SendVoucherEmailDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}

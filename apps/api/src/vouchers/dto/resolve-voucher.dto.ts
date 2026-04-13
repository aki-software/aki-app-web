import { IsString, Matches } from 'class-validator';

export class ResolveVoucherDto {
  @IsString()
  @Matches(/^[A-Za-z0-9]{8}$/)
  code: string;
}

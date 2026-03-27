import { IsString, Length } from 'class-validator';

export class ResolveVoucherDto {
  @IsString()
  @Length(4, 32)
  code: string;
}

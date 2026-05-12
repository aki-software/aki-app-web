import { IsString } from 'class-validator';

export class ResolveResetTokenDto {
  @IsString()
  token: string;
}

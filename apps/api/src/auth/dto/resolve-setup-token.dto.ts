import { IsString } from 'class-validator';

export class ResolveSetupTokenDto {
  @IsString()
  token: string;
}

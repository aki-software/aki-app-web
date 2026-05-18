import { IsBoolean } from 'class-validator';

export class UpdateInstitutionStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

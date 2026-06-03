import { IsString, IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UserRole } from '../entities/user.entity.js';

export class RegisterUserDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  institutionId?: string | null;
}

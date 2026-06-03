import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UserRole } from '../entities/user.entity.js';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  institutionId?: string | null;
}

import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../entities/user.entity.js';

export class ListUsersQueryDto {
  @IsOptional()
  @IsEnum(UserRole, { message: 'Rol inválido' })
  role?: UserRole;
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from './entities/user.entity.js';
import { UsersService } from './users.service.js';
import { UserRegistrationService } from './user-registration.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userRegistrationService: UserRegistrationService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll(@Query() query: ListUsersQueryDto) {
    if (query.role?.toUpperCase() === UserRole.THERAPIST) {
      const users = await this.usersService.findTherapists();
      return {
        data: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          institutionId: user.institutionId,
          institutionName: user.institution?.name ?? null,
          isActive: this.usersService.hasPasswordConfigured(user),
        })),
      };
    }

    return { data: [] };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userRegistrationService.register({
      name: createUserDto.name,
      role: createUserDto.role ?? UserRole.THERAPIST,
      email: createUserDto.email,
      institutionId: createUserDto.institutionId,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
      activationEmailSent: !!user.passwordSetupToken,
    };
  }

  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    const user = await this.userRegistrationService.register({
      name: registerUserDto.name,
      role: registerUserDto.role ?? UserRole.THERAPIST,
      email: registerUserDto.email,
      institutionId: registerUserDto.institutionId,
    });
    return {
      user_id: user.id,
      status: 'registered',
      activationEmailSent: !!user.passwordSetupToken,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/resend-activation')
  async resendActivation(@Param('id') id: string) {
    const user = await this.userRegistrationService.refreshPasswordSetupToken(id);
    return {
      id: user.id,
      activationEmailSent: !!user.passwordSetupToken,
    };
  }
}

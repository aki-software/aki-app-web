import {
  BadRequestException,
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

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userRegistrationService: UserRegistrationService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll(@Query('role') role?: string) {
    if (role?.toUpperCase() === UserRole.THERAPIST) {
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
    const user = await this.performRegistration(createUserDto);

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
    const user = await this.performRegistration(registerUserDto);
    return {
      user_id: user.id,
      status: 'registered',
      activationEmailSent: !!user.passwordSetupToken,
    };
  }

  private async performRegistration(payload: CreateUserDto | RegisterUserDto) {
    return await this.userRegistrationService.register({
      name: payload.name,
      role: payload.role ?? UserRole.THERAPIST,
      email: payload.email,
      institutionId: payload.institutionId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/resend-activation')
  async resendActivation(@Param('id') id: string) {
    try {
      const user =
        await this.userRegistrationService.refreshPasswordSetupToken(id);
      return {
        id: user.id,
        activationEmailSent: !!user.passwordSetupToken,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'No se pudo reenviar la invitación',
      );
    }
  }
}

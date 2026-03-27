import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MailService } from '../mail/mail.service';

type AuthenticatedRequest = Request & {
  user?: {
    role?: string;
  };
};

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query('role') role?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);

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

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body()
    payload: {
      name: string;
      role?: UserRole;
      email?: string;
      institutionId?: string | null;
    },
    @Req() req?: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);

    const user = await this.usersService.register(
      payload.name,
      payload.role ?? UserRole.THERAPIST,
      payload.email,
      payload.institutionId,
    );

    const activationEmailSent =
      !!user.passwordSetupToken &&
      !!user.email &&
      (await this.mailService.sendAccountActivation(
        user.email,
        user.name,
        this.usersService.buildPasswordSetupLink(user.passwordSetupToken),
        null,
      ));

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
      activationEmailSent,
    };
  }

  @Post('register')
  async register(
    @Body()
    payload: {
      name: string;
      role?: UserRole;
      email?: string;
      institutionId?: string | null;
    },
  ) {
    const user = await this.usersService.register(
      payload.name,
      payload.role ?? UserRole.THERAPIST,
      payload.email,
      payload.institutionId,
    );
    return {
      user_id: user.id,
      status: 'registered',
      activationEmailSent: false,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/resend-activation')
  async resendActivation(
    @Param('id') id: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);

    try {
      const user = await this.usersService.refreshPasswordSetupToken(id);
      const activationEmailSent =
        !!user.passwordSetupToken &&
        (await this.mailService.sendAccountActivation(
          user.email,
          user.name,
          this.usersService.buildPasswordSetupLink(user.passwordSetupToken),
          user.institution?.name ?? null,
        ));

      return {
        id: user.id,
        activationEmailSent,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'No se pudo reenviar la invitación',
      );
    }
  }

  private assertAdmin(req?: AuthenticatedRequest) {
    if (req?.user?.role?.toUpperCase() !== UserRole.ADMIN) {
      throw new UnauthorizedException('Se requiere usuario administrador');
    }
  }
}

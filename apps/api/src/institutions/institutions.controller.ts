import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  Param,
  Patch,
  Query,
  Inject,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InstitutionsService } from './institutions.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import type { QueueAdapter } from '../common/adapters/queue.adapter';
import { QUEUE_ADAPTER } from '../common/constants/adapters.constants';
import { JobNames, SendEmailJobPayload } from '../common/jobs';

@Controller('institutions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstitutionsController {
  constructor(
    private readonly institutionsService: InstitutionsService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    @Inject(QUEUE_ADAPTER)
    private readonly queueAdapter: QueueAdapter,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    const institutions = await this.institutionsService.findAll();
    return {
      data: institutions.map((institution) => ({
        id: institution.id,
        name: institution.name,
        createdAt: institution.createdAt,
        billingEmail: institution.billingEmail,
        responsibleTherapistUserId: institution.responsibleTherapistUserId,
        responsibleTherapistName:
          institution.responsibleTherapist?.name ?? null,
        responsibleTherapistActive: institution.responsibleTherapist
          ? this.usersService.hasPasswordConfigured(
              institution.responsibleTherapist,
            )
          : false,
      })),
    };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body()
    payload: {
      name: string;
      email?: string;
      billingEmail?: string;
      responsibleTherapistUserId?: string | null;
    },
  ) {
    if (!payload.name?.trim()) {
      throw new BadRequestException('El nombre es obligatorio');
    }

    if (!payload.email?.trim()) {
      throw new BadRequestException('El email es obligatorio');
    }

    const hasResponsibleUserId = !!payload.responsibleTherapistUserId?.trim();

    let institution = await this.institutionsService.create({
      name: payload.name,
      billingEmail: payload.billingEmail,
      responsibleTherapistUserId: payload.responsibleTherapistUserId ?? null,
    });

    let activationEmailSent = false;

    if (hasResponsibleUserId) {
      institution = await this.institutionsService.assignResponsibleTherapist(
        institution.id,
        payload.responsibleTherapistUserId!.trim(),
      );
    } else {
      // Creamos el usuario operativo para login usando el email informado.
      const responsibleUser = await this.usersService.register(
        payload.email.trim(),
        UserRole.THERAPIST,
        payload.email.trim(),
        institution.id,
      );

      institution = await this.institutionsService.assignResponsibleTherapist(
        institution.id,
        responsibleUser.id,
      );

      if (responsibleUser.passwordSetupToken) {
        activationEmailSent = this.queueAdapter.isConfigured()
          ? await this.enqueueActivationEmail(
              responsibleUser.email,
              responsibleUser.name,
              institution.name,
              responsibleUser,
            )
          : await this.mailService.sendAccountActivation(
              responsibleUser.email,
              responsibleUser.name,
              this.usersService.buildPasswordSetupLink(
                responsibleUser.passwordSetupToken,
              ),
              institution.name,
            );
      }
    }

    return {
      id: institution.id,
      name: institution.name,
      billingEmail: institution.billingEmail,
      responsibleTherapistUserId: institution.responsibleTherapistUserId,
      responsibleTherapistName: institution.responsibleTherapist?.name ?? null,
      activationEmailSent,
    };
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string, @Req() req?: AuthenticatedRequest) {
    const isOwnerOrAdmin =
      req?.user?.role?.toUpperCase() === UserRole.ADMIN ||
      req?.user?.institutionId === id;

    if (!isOwnerOrAdmin) {
      throw new UnauthorizedException(
        'No tienes permisos para ver las estadísticas de esta institución',
      );
    }

    return await this.institutionsService.getStats(id);
  }

  @Get(':id/overview')
  async getOverview(
    @Param('id') id: string,
    @Req() req?: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    const isOwnerOrAdmin =
      req?.user?.role?.toUpperCase() === UserRole.ADMIN ||
      req?.user?.institutionId === id;

    if (!isOwnerOrAdmin) {
      throw new UnauthorizedException(
        'No tienes permisos para ver el overview de esta institución',
      );
    }

    const parsedDays = days ? parseInt(days, 10) : 7;
    const normalizedDays = Number.isFinite(parsedDays)
      ? Math.min(Math.max(parsedDays, 1), 90)
      : 7;

    return await this.institutionsService.getOverview(id, normalizedDays);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() payload: { name?: string; billingEmail?: string },
  ) {
    const institution = await this.institutionsService.update(id, payload);
    return {
      id: institution.id,
      name: institution.name,
      billingEmail: institution.billingEmail,
      responsibleTherapistUserId: institution.responsibleTherapistUserId,
      responsibleTherapistName: institution.responsibleTherapist?.name ?? null,
    };
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() payload: { isActive: boolean },
  ) {
    const institution = await this.institutionsService.updateStatus(
      id,
      payload.isActive,
    );
    return {
      id: institution.id,
      isActive: institution.isActive,
    };
  }

  @Post(':id/operational-account')
  @Roles(UserRole.ADMIN)
  async createOperationalAccount(
    @Param('id') id: string,
    @Body() payload: { email?: string },
  ) {
    const email = payload.email?.trim();
    if (!email) {
      throw new BadRequestException('El email es obligatorio');
    }

    const existingInstitution =
      await this.institutionsService.findOneOrFail(id);
    if (existingInstitution.responsibleTherapistUserId) {
      throw new BadRequestException(
        'La institución ya tiene una cuenta operativa asignada',
      );
    }

    // Creamos el usuario operativo para login usando el email informado.
    const responsibleUser = await this.usersService.register(
      email,
      UserRole.THERAPIST,
      email,
      existingInstitution.id,
    );

    const institution =
      await this.institutionsService.assignResponsibleTherapist(
        existingInstitution.id,
        responsibleUser.id,
      );

    let activationEmailSent = false;
    if (responsibleUser.passwordSetupToken) {
      activationEmailSent = this.queueAdapter.isConfigured()
        ? await this.enqueueActivationEmail(
            responsibleUser.email,
            responsibleUser.name,
            institution.name,
            responsibleUser,
          )
        : await this.mailService.sendAccountActivation(
            responsibleUser.email,
            responsibleUser.name,
            this.usersService.buildPasswordSetupLink(
              responsibleUser.passwordSetupToken,
            ),
            institution.name,
          );
    }

    return {
      id: institution.id,
      name: institution.name,
      billingEmail: institution.billingEmail,
      responsibleTherapistUserId: institution.responsibleTherapistUserId,
      responsibleTherapistName: institution.responsibleTherapist?.name ?? null,
      responsibleTherapistActive: institution.responsibleTherapist
        ? this.usersService.hasPasswordConfigured(
            institution.responsibleTherapist,
          )
        : false,
      activationEmailSent,
    };
  }

  private async enqueueActivationEmail(
    email: string,
    name: string,
    institutionName: string | null,
    user: { passwordSetupToken?: string | null },
  ): Promise<boolean> {
    if (!user.passwordSetupToken) return false;

    const payload: SendEmailJobPayload = {
      attempts: 3,
      backoffMs: 60_000,
      backoffType: 'exponential',
      timeoutMs: 20_000,
      concurrencyKey: 'email',
      concurrencyLimit: 10,
      template: 'account-activation',
      payload: {
        name,
        activationLink: this.usersService.buildPasswordSetupLink(
          user.passwordSetupToken,
        ),
        institutionName,
      },
      meta: {
        to: email,
        subject: 'Activá tu cuenta de A.kit',
      },
    };

    await this.queueAdapter.enqueue(JobNames.SendEmail, payload, {
      attempts: payload.attempts,
      backoffMs: payload.backoffMs,
      backoffType: payload.backoffType,
      timeoutMs: payload.timeoutMs,
      concurrencyKey: payload.concurrencyKey,
      concurrencyLimit: payload.concurrencyLimit,
    });
    return true;
  }
}

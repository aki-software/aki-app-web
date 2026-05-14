import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { QueueAdapter } from '../../common/adapters/queue.adapter';
import { QUEUE_ADAPTER } from '../../common/constants/adapters.constants';
import { JobNames, SendEmailJobPayload } from '../../common/jobs';
import { MailService } from '../../mail/mail.service';
import { UserRole } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { CreateInstitutionDto } from '../dto/create-institution.dto';
import { Institution } from '../entities/institution.entity';
import { InstitutionsService } from '../institutions.service';

@Injectable()
export class InstitutionOperationalAccountService {
  constructor(
    private readonly institutionsService: InstitutionsService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    @Inject(QUEUE_ADAPTER)
    private readonly queueAdapter: QueueAdapter,
  ) {}

  async createInstitutionWithOperationalAccount(
    payload: CreateInstitutionDto,
  ): Promise<{ institution: Institution; activationEmailSent: boolean }> {
    const hasResponsibleUserId = !!payload.responsibleTherapistUserId?.trim();

    let institution = await this.institutionsService.create({
      name: payload.name,
      billingEmail: payload.billingEmail,
      responsibleTherapistUserId: payload.responsibleTherapistUserId ?? null,
      email: payload.email,
    });

    if (hasResponsibleUserId) {
      institution = await this.institutionsService.assignResponsibleTherapist(
        institution.id,
        payload.responsibleTherapistUserId!.trim(),
      );

      return {
        institution,
        activationEmailSent: false,
      };
    }

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

    const activationEmailSent = await this.sendActivationEmailIfNeeded(
      responsibleUser.email,
      responsibleUser.name,
      institution.name,
      responsibleUser.passwordSetupToken,
    );

    return {
      institution,
      activationEmailSent,
    };
  }

  async createOperationalAccount(
    institutionId: string,
    email: string,
  ): Promise<{ institution: Institution; activationEmailSent: boolean }> {
    const existingInstitution =
      await this.institutionsService.findOneOrFail(institutionId);

    if (existingInstitution.responsibleTherapistUserId) {
      throw new BadRequestException(
        'La institución ya tiene una cuenta operativa asignada',
      );
    }

    const normalizedEmail = email.trim();
    const responsibleUser = await this.usersService.register(
      normalizedEmail,
      UserRole.THERAPIST,
      normalizedEmail,
      existingInstitution.id,
    );

    const institution =
      await this.institutionsService.assignResponsibleTherapist(
        existingInstitution.id,
        responsibleUser.id,
      );

    const activationEmailSent = await this.sendActivationEmailIfNeeded(
      responsibleUser.email,
      responsibleUser.name,
      institution.name,
      responsibleUser.passwordSetupToken,
    );

    return {
      institution,
      activationEmailSent,
    };
  }

  private async sendActivationEmailIfNeeded(
    email: string,
    name: string,
    institutionName: string | null,
    passwordSetupToken?: string | null,
  ): Promise<boolean> {
    if (!passwordSetupToken) {
      return false;
    }

    if (this.queueAdapter.isConfigured()) {
      await this.enqueueActivationEmail(
        email,
        name,
        institutionName,
        passwordSetupToken,
      );

      return true;
    }

    return this.mailService.sendAccountActivation(
      email,
      name,
      this.usersService.buildPasswordSetupLink(passwordSetupToken),
      institutionName,
    );
  }

  private async enqueueActivationEmail(
    email: string,
    name: string,
    institutionName: string | null,
    passwordSetupToken: string,
  ): Promise<void> {
    const payload: SendEmailJobPayload = {
      jobId: `activation-email-${email}-${Date.now()}`,
      attempts: 3,
      backoffMs: 60_000,
      backoffType: 'exponential',
      timeoutMs: 20_000,
      concurrencyKey: 'email',
      concurrencyLimit: 10,
      template: 'account-activation',
      payload: {
        name,
        activationLink:
          this.usersService.buildPasswordSetupLink(passwordSetupToken),
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
  }
}

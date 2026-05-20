import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity.js';
import { UserRegistrationService } from '../../users/user-registration.service.js';
import { CreateInstitutionDto } from '../dto/create-institution.dto.js';
import { Institution } from '../entities/institution.entity.js';
import { InstitutionsService } from '../institutions.service.js';

@Injectable()
export class InstitutionOperationalAccountService {
  constructor(
    private readonly institutionsService: InstitutionsService,
    private readonly userRegistrationService: UserRegistrationService,
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

    const responsibleUser = await this.userRegistrationService.register({
      name: payload.email.trim(),
      role: UserRole.THERAPIST,
      email: payload.email.trim(),
      institutionId: institution.id,
    });

    institution = await this.institutionsService.assignResponsibleTherapist(
      institution.id,
      responsibleUser.id,
    );

    return {
      institution,
      activationEmailSent: !!responsibleUser.passwordSetupToken,
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
    const responsibleUser = await this.userRegistrationService.register({
      name: normalizedEmail,
      role: UserRole.THERAPIST,
      email: normalizedEmail,
      institutionId: existingInstitution.id,
    });

    const institution =
      await this.institutionsService.assignResponsibleTherapist(
        existingInstitution.id,
        responsibleUser.id,
      );

    return {
      institution,
      activationEmailSent: !!responsibleUser.passwordSetupToken,
    };
  }
}

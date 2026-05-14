import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { Institution } from '../entities/institution.entity';
import type {
  InstitutionListItemResponse,
  InstitutionResponse,
} from '../institutions.types';

@Injectable()
export class InstitutionPresenterService {
  constructor(private readonly usersService: UsersService) {}

  toInstitutionResponse(institution: Institution): InstitutionResponse {
    return {
      id: institution.id,
      name: institution.name,
      billingEmail: institution.billingEmail,
      isActive: institution.isActive,
      createdAt: institution.createdAt,
      responsibleTherapistUserId: institution.responsibleTherapistUserId,
      responsibleTherapistName: institution.responsibleTherapist?.name ?? null,
    };
  }

  toInstitutionListItemResponse(
    institution: Institution,
  ): InstitutionListItemResponse {
    return {
      ...this.toInstitutionResponse(institution),
      responsibleTherapistActive: institution.responsibleTherapist
        ? this.usersService.hasPasswordConfigured(
            institution.responsibleTherapist,
          )
        : false,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { hasPasswordConfigured } from '../../users/users.utils.js';
import { Institution } from '../entities/institution.entity.js';
import {
  InstitutionListItemResponse,
  InstitutionResponse,
} from '@akit/contracts';

@Injectable()
export class InstitutionPresenterService {
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
        ? hasPasswordConfigured(
            institution.responsibleTherapist,
          )
        : false,
    };
  }
}


import { Injectable, BadRequestException } from '@nestjs/common';
import { UserRegistrationService } from '../../users/user-registration.service.js';
import { VoucherOwnerType } from '../entities/voucher.enums.js';

export interface NormalizedVoucherOwner {
  ownerType: VoucherOwnerType;
  ownerUserId: string | null;
  ownerInstitutionId: string | null;
}

@Injectable()
export class VoucherOwnerResolver {
  constructor(
    private readonly userRegistrationService: UserRegistrationService,
  ) {}

  async resolve(
    ownerType: VoucherOwnerType,
    ownerUserId?: string | null,
    ownerInstitutionId?: string | null,
  ): Promise<NormalizedVoucherOwner> {
    if (!ownerType) {
      throw new BadRequestException(
        'El tipo de dueño (ownerType) es obligatorio',
      );
    }

    if (ownerType === VoucherOwnerType.THERAPIST) {
      if (!ownerUserId) {
        throw new BadRequestException(
          'El ID de usuario es obligatorio para vouchers de terapeuta',
        );
      }

      const therapist =
        await this.userRegistrationService.ensureInstitutionOwner(ownerUserId);
      return {
        ownerType: VoucherOwnerType.INSTITUTION,
        ownerUserId: therapist.id,
        ownerInstitutionId: therapist.institutionId,
      };
    }

    if (ownerType === VoucherOwnerType.INSTITUTION && !ownerInstitutionId) {
      throw new BadRequestException(
        'El ID de institución es obligatorio para vouchers de institución',
      );
    }

    return {
      ownerType,
      ownerUserId: ownerUserId ?? null,
      ownerInstitutionId: ownerInstitutionId ?? null,
    };
  }
}

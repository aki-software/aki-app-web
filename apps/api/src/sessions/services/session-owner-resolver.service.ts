import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service.js';
import { UserRegistrationService } from '../../users/user-registration.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { User, UserRole } from '../../users/entities/user.entity.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';

export interface ResolvedOwnerContext {
  user: User | null;
  voucher: Voucher | null;
  fallbackOwner: User | null;
  inferredPatientName: string;
  isTherapistUser: boolean;
  isPatientUser: boolean;
}

@Injectable()
export class SessionOwnerResolverService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userRegistrationService: UserRegistrationService,
    private readonly vouchersService: VouchersService,
  ) {}

  async resolveContext(
    payloadUserId: string | null,
    payloadVoucherCode: string | null,
    payloadTherapistUserId: string | null,
    payloadInstitutionId: string | null,
    payloadPatientName?: string,
  ): Promise<ResolvedOwnerContext> {
    const user = payloadUserId
      ? await this.usersService.findOne(payloadUserId)
      : null;

    const voucher = payloadVoucherCode
      ? await this.vouchersService.resolveAvailableVoucher(payloadVoucherCode)
      : null;

    const inferredPatientName =
      payloadPatientName || user?.name || 'Usuario App';

    const isTherapistUser =
      user?.role === UserRole.THERAPIST || user?.role === UserRole.ADMIN;

    const isPatientUser = user?.role === UserRole.PATIENT;

    const fallbackOwner =
      !payloadTherapistUserId &&
      !payloadInstitutionId &&
      !voucher &&
      (!user || isPatientUser)
        ? await this.userRegistrationService.getOrCreateIndividualTestsOwner()
        : null;

    return {
      user,
      voucher,
      fallbackOwner,
      inferredPatientName,
      isTherapistUser,
      isPatientUser,
    };
  }
}

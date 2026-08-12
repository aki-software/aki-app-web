import { UserRole } from '@akit/contracts';
import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service.js';
import { UserRegistrationService } from '../../users/user-registration.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { User } from '../../users/entities/user.entity.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { ResolvedOwnerContext } from '../interfaces/resolved-owner-context.interface.js';

const DEFAULT_PATIENT_NAME = 'Usuario App';

@Injectable()
export class SessionOwnerResolverService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userRegistrationService: UserRegistrationService,
    private readonly vouchersService: VouchersService,
  ) {}

  async resolveFirebaseUser(email: string): Promise<User | null> {
    return this.usersService.findByEmail(email);
  }

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
      payloadPatientName || user?.name || DEFAULT_PATIENT_NAME;

    const isTherapistUser =
      user?.role === UserRole.THERAPIST ||
      user?.role === UserRole.ADMIN ||
      user?.role === UserRole.INSTITUTION_ADMIN;

    const isPatientUser = user?.role === ('PATIENT' as any);

    const fallbackOwner = this.needsFallbackOwner(
      payloadTherapistUserId,
      payloadInstitutionId,
      voucher,
      user,
      isPatientUser,
    )
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

  private needsFallbackOwner(
    payloadTherapistUserId: string | null,
    payloadInstitutionId: string | null,
    voucher: Voucher | null,
    user: User | null,
    isPatientUser: boolean,
  ): boolean {
    return (
      !payloadTherapistUserId &&
      !payloadInstitutionId &&
      !voucher &&
      (!user || isPatientUser)
    );
  }
}

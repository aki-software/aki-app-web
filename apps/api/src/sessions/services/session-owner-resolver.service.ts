import { UserRole } from '@akit/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity.js';
import { UsersService } from '../../users/users.service.js';
import { UserRegistrationService } from '../../users/user-registration.service.js';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { User } from '../../users/entities/user.entity.js';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { ResolvedOwnerContext } from '../interfaces/resolved-owner-context.interface.js';

const DEFAULT_PATIENT_NAME = 'Usuario App';
// Firebase-only patients never receive a locally usable password credential.
const FIREBASE_ONLY_PASSWORD_HASH = 'firebase-only-no-password';

type FirebaseSessionOwner = {
  id: string;
  institutionId: string | null;
};

type FirebaseIdentity = {
  uid?: string;
  email: string;
  displayName?: string;
};

@Injectable()
export class SessionOwnerResolverService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    private readonly userRegistrationService: UserRegistrationService,
    private readonly vouchersService: VouchersService,
  ) {}

  async resolveFirebaseUser(
    identity: FirebaseIdentity | string,
    allowPatientProvisioning: boolean,
  ): Promise<FirebaseSessionOwner | null> {
    const firebaseIdentity = this.normalizeFirebaseIdentity(identity);

    if (allowPatientProvisioning) {
      return this.resolveFirebasePatient(firebaseIdentity, true);
    }

    const user = await this.usersService.findByEmail(firebaseIdentity.email);
    return user ? { id: user.id, institutionId: user.institutionId } : null;
  }

  async resolveFirebasePatient(
    identity: FirebaseIdentity | string,
    allowProvisioning: boolean,
  ): Promise<FirebaseSessionOwner | null> {
    const firebaseIdentity = this.normalizeFirebaseIdentity(identity);
    const byUid = firebaseIdentity.uid
      ? await this.findPatient({ firebaseUid: firebaseIdentity.uid })
      : null;
    if (byUid) return this.toOwner(byUid);

    const byEmail = await this.findPatient({ email: firebaseIdentity.email });
    if (byEmail) {
      await this.linkFirebaseUid(byEmail, firebaseIdentity.uid);
      return this.toOwner(byEmail);
    }

    if (!allowProvisioning) return null;

    try {
      const patient = await this.patientRepository.save(
        this.patientRepository.create({
          email: firebaseIdentity.email,
          firebaseUid: firebaseIdentity.uid ?? null,
          name: firebaseIdentity.displayName || DEFAULT_PATIENT_NAME,
          passwordHash: FIREBASE_ONLY_PASSWORD_HASH,
        }),
      );
      return this.toOwner(patient);
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;

      const concurrentPatient = firebaseIdentity.uid
        ? ((await this.findPatient({ firebaseUid: firebaseIdentity.uid })) ??
          (await this.findPatient({ email: firebaseIdentity.email })))
        : await this.findPatient({ email: firebaseIdentity.email });
      if (concurrentPatient) {
        await this.linkFirebaseUid(concurrentPatient, firebaseIdentity.uid);
        return this.toOwner(concurrentPatient);
      }
      throw error;
    }
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

  private normalizeFirebaseIdentity(
    identity: FirebaseIdentity | string,
  ): FirebaseIdentity {
    if (typeof identity === 'string') {
      return { email: identity.trim().toLowerCase() };
    }

    return {
      uid: identity.uid?.trim() || undefined,
      email: identity.email.trim().toLowerCase(),
      displayName: identity.displayName?.trim() || undefined,
    };
  }

  private findPatient(
    where: Pick<Patient, 'email'> | Pick<Patient, 'firebaseUid'>,
  ): Promise<FirebaseSessionOwner | null> {
    return this.patientRepository.findOne({
      select: { id: true, institutionId: true, firebaseUid: true },
      where,
    });
  }

  private toOwner(patient: FirebaseSessionOwner): FirebaseSessionOwner {
    return { id: patient.id, institutionId: patient.institutionId };
  }

  private async linkFirebaseUid(
    patient: FirebaseSessionOwner & { firebaseUid?: string | null },
    firebaseUid?: string,
  ): Promise<void> {
    if (!firebaseUid || patient.firebaseUid) return;

    try {
      await this.patientRepository.update(
        { id: patient.id, firebaseUid: null },
        { firebaseUid },
      );
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'driverError' in error &&
      (error as { driverError?: { code?: string } }).driverError?.code ===
        '23505'
    );
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

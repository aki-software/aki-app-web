import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserRole } from './entities/user.entity.js';
import { UsersService } from './users.service.js';
import { AccountActivationRequestedEvent } from '../events/domain-events.js';
import { CryptoService } from '../common/services/crypto.service.js';
import { normalizeUserRole } from '../common/utils/role.utils.js';
import { USER_ERROR_MESSAGES } from './users.constants.js';
import { RegisterUserDto } from './dto/register-user.dto.js';

export type { RegisterUserDto };

@Injectable()
export class UserRegistrationService {
  private individualTestsOwnerCache: User | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cryptoService: CryptoService,
  ) {}

  async register(payload: RegisterUserDto): Promise<User> {
    const { name, email, role, institutionId } = payload;
    const normalizedRole = normalizeUserRole(role);

    if (email) {
      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        throw new BadRequestException(
          'El correo electrónico ya está registrado por otro usuario.',
        );
      }
    }

    const normalizedEmail =
      email ??
      `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${Date.now()}@akit.local`;

    const passwordSetupToken = this.cryptoService.generateToken(24);
    const passwordSetupExpiresAt = this.buildPasswordSetupExpiry();

    let user = await this.usersService.register({
      name,
      email: normalizedEmail,
      role: normalizedRole,
      institutionId: institutionId ?? null,
      passwordSetupToken,
      passwordSetupExpiresAt,
      passwordHash: 'pending-password-setup',
    });

    if (
      (normalizedRole === UserRole.THERAPIST ||
        normalizedRole === UserRole.INSTITUTION_ADMIN) &&
      !user.institutionId
    ) {
      await this.eventEmitter.emitAsync('user.registered', user);
      user = (await this.usersService.findOne(user.id)) as User;
    }

    // Patients are handled in a separate module now. Users registered here are web platform users
    // who should receive an account activation email unless they have a synthetic local email.
    if (
      user.passwordSetupToken &&
      user.email &&
      !user.email.endsWith('@akit.local')
    ) {
      const activationLink = this.usersService.buildPasswordSetupLink(
        user.passwordSetupToken,
      );
      await this.eventEmitter.emitAsync(
        'account.activation.requested',
        new AccountActivationRequestedEvent(
          user.email,
          user.name,
          activationLink,
          user.institution?.name ?? null,
        ),
      );
    }

    return user;
  }

  async ensureInstitutionOwner(userOrId: User | string): Promise<User> {
    const user =
      typeof userOrId === 'string'
        ? await this.usersService.findOne(userOrId)
        : userOrId;

    if (!user) {
      throw new NotFoundException(USER_ERROR_MESSAGES.institutionOwnerMissing);
    }

    if (user.institutionId) {
      return user;
    }

    await this.eventEmitter.emitAsync('user.registered', user);
    return (await this.usersService.findOne(user.id)) as User;
  }

  async refreshPasswordSetupToken(userId: string): Promise<User> {
    const user = await this.usersService.findOneWithInstitution(userId);
    if (!user) {
      throw new NotFoundException(USER_ERROR_MESSAGES.notFound);
    }

    if (this.usersService.hasPasswordConfigured(user)) {
      throw new ConflictException(USER_ERROR_MESSAGES.accountAlreadyActive);
    }

    const passwordSetupToken = this.cryptoService.generateToken(24);
    const passwordSetupExpiresAt = this.buildPasswordSetupExpiry();

    const updatedUser = await this.usersService.register({
      ...user,
      passwordSetupToken,
      passwordSetupExpiresAt,
    });

    if (
      updatedUser.passwordSetupToken &&
      updatedUser.email &&
      !updatedUser.email.endsWith('@akit.local')
    ) {
      const activationLink = this.usersService.buildPasswordSetupLink(
        updatedUser.passwordSetupToken,
      );
      await this.eventEmitter.emitAsync(
        'account.activation.requested',
        new AccountActivationRequestedEvent(
          updatedUser.email,
          updatedUser.name,
          activationLink,
          updatedUser.institution?.name ?? null,
        ),
      );
    }

    return updatedUser;
  }

  async getOrCreateIndividualTestsOwner(): Promise<User> {
    if (this.individualTestsOwnerCache) {
      return this.individualTestsOwnerCache;
    }

    const email =
      this.configService.get<string>('INDIVIDUAL_TEST_OWNER_EMAIL') ||
      this.configService.get<string>('ADMIN_USER') ||
      'owner@akit.app';
    const name =
      this.configService.get<string>('INDIVIDUAL_TEST_OWNER_NAME') ||
      'Owner Plataforma';
    const role = normalizeUserRole(
      this.configService.get<string>('INDIVIDUAL_TEST_OWNER_ROLE') ||
        UserRole.THERAPIST,
    );
    const institutionId =
      this.configService.get<string>('INDIVIDUAL_TEST_OWNER_INSTITUTION_ID') ||
      null;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      this.individualTestsOwnerCache = existingUser;
      return existingUser;
    }

    const newUser = await this.register({ name, role, email, institutionId });
    this.individualTestsOwnerCache = newUser;
    return newUser;
  }

  private buildPasswordSetupExpiry(): Date {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72h default
    return expiresAt;
  }
}

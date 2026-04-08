import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Institution } from '../institutions/entities/institution.entity';

@Injectable()
export class UsersService {
  private static readonly PASSWORD_SETUP_TTL_HOURS = 72;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Institution)
    private institutionRepository: Repository<Institution>,
  ) {}

  async register(
    name: string,
    role?: UserRole | string,
    email?: string,
    institutionId?: string | null,
  ): Promise<User> {
    const normalizedEmail =
      email ??
      `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${Date.now()}@akit.local`;
    const normalizedRole = this.normalizeRole(role);
    const user = this.userRepository.create({
      name,
      role: normalizedRole,
      email: normalizedEmail,
      passwordHash: 'pending-password-setup',
      passwordSetupToken: this.generatePasswordSetupToken(),
      passwordSetupExpiresAt: this.buildPasswordSetupExpiry(),
      passwordSetAt: null,
      institutionId: institutionId ?? null,
    });
    const savedUser = await this.userRepository.save(user);

    if (normalizedRole === UserRole.THERAPIST && !savedUser.institutionId) {
      return await this.ensureInstitutionOwner(savedUser);
    }

    return savedUser;
  }

  async findOne(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findOneWithInstitution(id: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
      relations: ['institution'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findByPasswordSetupToken(token: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { passwordSetupToken: token },
      relations: ['institution'],
    });
  }

  async findTherapists(): Promise<User[]> {
    return await this.userRepository.find({
      where: { role: UserRole.THERAPIST },
      relations: ['institution'],
      order: { name: 'ASC' },
    });
  }

  async findInstitutions(): Promise<Institution[]> {
    return await this.institutionRepository.find({
      relations: ['responsibleTherapist'],
      order: { name: 'ASC' },
    });
  }

  async getOrCreateIndividualTestsOwner(): Promise<User> {
    const email =
      this.configService.get<string>('INDIVIDUAL_TEST_OWNER_EMAIL') ||
      this.configService.get<string>('ADMIN_USER') ||
      'owner@akit.app';
    const name =
      this.configService.get<string>('INDIVIDUAL_TEST_OWNER_NAME') ||
      'Owner Plataforma';
    const role = this.normalizeRole(
      this.configService.get<string>('INDIVIDUAL_TEST_OWNER_ROLE') ||
        UserRole.THERAPIST,
    );
    const institutionId =
      this.configService.get<string>('INDIVIDUAL_TEST_OWNER_INSTITUTION_ID') ||
      null;

    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      return existingUser;
    }

    return await this.register(name, role, email, institutionId);
  }

  async ensureInstitutionOwner(userOrId: User | string): Promise<User> {
    const user =
      typeof userOrId === 'string' ? await this.findOne(userOrId) : userOrId;

    if (!user) {
      throw new Error(
        'Usuario no encontrado para asegurar ownership institucional',
      );
    }

    if (user.institutionId) {
      return user;
    }

    const privateInstitution = await this.institutionRepository.save(
      this.institutionRepository.create({
        name: `Consultorio ${user.name}`,
        billingEmail: user.email,
        responsibleTherapistUserId: user.id,
        isActive: true,
      }),
    );

    user.institutionId = privateInstitution.id;
    return await this.userRepository.save(user);
  }

  async setupPassword(token: string, plainPassword: string): Promise<User> {
    const user = await this.findByPasswordSetupToken(token);
    if (!user) {
      throw new Error('Token de activación inválido');
    }

    if (
      !user.passwordSetupExpiresAt ||
      user.passwordSetupExpiresAt.getTime() < Date.now()
    ) {
      throw new Error('Token de activación expirado');
    }

    user.passwordHash = this.hashPassword(plainPassword);
    user.passwordSetAt = new Date();
    user.passwordSetupToken = null;
    user.passwordSetupExpiresAt = null;
    return await this.userRepository.save(user);
  }

  async refreshPasswordSetupToken(userId: string): Promise<User> {
    const user = await this.findOneWithInstitution(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (this.hasPasswordConfigured(user)) {
      throw new Error('La cuenta ya está activa');
    }

    user.passwordSetupToken = this.generatePasswordSetupToken();
    user.passwordSetupExpiresAt = this.buildPasswordSetupExpiry();
    return await this.userRepository.save(user);
  }

  verifyPassword(plainPassword: string, passwordHash: string): boolean {
    if (!passwordHash.startsWith('scrypt$')) {
      return false;
    }

    const [, salt, storedHash] = passwordHash.split('$');
    if (!salt || !storedHash) {
      return false;
    }

    const derived = scryptSync(plainPassword, salt, 64).toString('hex');
    return timingSafeEqual(Buffer.from(derived), Buffer.from(storedHash));
  }

  hasPasswordConfigured(user: User): boolean {
    return !!user.passwordSetAt && user.passwordHash.startsWith('scrypt$');
  }

  buildPasswordSetupLink(token: string): string {
    const baseUrl =
      this.configService.get<string>('WEB_APP_URL') || 'http://localhost:5173';
    return `${baseUrl.replace(/\/$/, '')}/setup-password?token=${token}`;
  }

  private normalizeRole(role?: UserRole | string): UserRole {
    const normalized = role?.toString().trim().toUpperCase();
    if (normalized === UserRole.ADMIN) {
      return UserRole.ADMIN;
    }
    if (normalized === UserRole.PATIENT || normalized === 'PACIENTE') {
      return UserRole.PATIENT;
    }
    return UserRole.THERAPIST;
  }

  private generatePasswordSetupToken(): string {
    return randomBytes(24).toString('base64url');
  }

  private buildPasswordSetupExpiry(): Date {
    const expiresAt = new Date();
    expiresAt.setHours(
      expiresAt.getHours() + UsersService.PASSWORD_SETUP_TTL_HOURS,
    );
    return expiresAt;
  }

  private hashPassword(plainPassword: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(plainPassword, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }
}

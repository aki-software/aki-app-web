import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Institution } from '../institutions/entities/institution.entity';

@Injectable()
export class UsersService {
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
      institutionId: institutionId ?? null,
    });
    const savedUser = await this.userRepository.save(user);

    if (
      normalizedRole === UserRole.THERAPIST &&
      !savedUser.institutionId
    ) {
      return await this.ensureInstitutionOwner(savedUser);
    }

    return savedUser;
  }

  async findOne(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
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
      typeof userOrId === 'string'
        ? await this.findOne(userOrId)
        : userOrId;

    if (!user) {
      throw new Error('Usuario no encontrado para asegurar ownership institucional');
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
}

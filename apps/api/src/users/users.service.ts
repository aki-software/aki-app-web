import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity.js';
import { Institution } from '../institutions/entities/institution.entity.js';
import { USER_ERROR_MESSAGES } from './users.constants.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async register(userData: Partial<User>): Promise<User> {
    const user = userData.id
      ? await this.userRepository.preload(userData)
      : this.userRepository.create(userData);

    if (!user) {
      throw new Error(USER_ERROR_MESSAGES.notFound);
    }

    return await this.userRepository.save(user);
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

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { passwordResetToken: token },
      relations: ['institution'],
    });
  }

  buildPasswordSetupLink(token: string): string {
    const baseUrl =
      this.configService.get<string>('WEB_APP_URL') || 'http://localhost:5173';
    return `${baseUrl.replace(/\/$/, '')}/setup-password?token=${token}`;
  }

  buildPasswordResetLink(token: string): string {
    const baseUrl =
      this.configService.get<string>('WEB_APP_URL') || 'http://localhost:5173';
    return `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;
  }

  hasPasswordConfigured(user: User): boolean {
    return !!user.passwordSetAt && user.passwordHash.startsWith('scrypt$');
  }
}

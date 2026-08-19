import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity.js';
import { USER_ERROR_MESSAGES } from './users.constants.js';
import { hasPasswordConfigured } from './users.utils.js';

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
      throw new NotFoundException(USER_ERROR_MESSAGES.notFound);
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
    const rawBaseUrl =
      this.configService.get<string>('WEB_APP_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173';
    const baseUrl = this.cleanBaseUrl(rawBaseUrl);
    return `${baseUrl}/setup-password?token=${token}`;
  }

  buildPasswordResetLink(token: string): string {
    const rawBaseUrl =
      this.configService.get<string>('WEB_APP_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173';
    const baseUrl = this.cleanBaseUrl(rawBaseUrl);
    return `${baseUrl}/reset-password?token=${token}`;
  }

  private cleanBaseUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return url.replace(/\/dashboard\/?$/, '').replace(/\/$/, '');
    }
  }

  hasPasswordConfigured(user: User): boolean {
    return hasPasswordConfigured(user);
  }
}

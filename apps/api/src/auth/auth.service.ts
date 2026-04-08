import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async login(loginDto: LoginDto) {
    const adminEmail = this.configService.get<string>('ADMIN_USER');
    const adminPass = this.configService.get<string>('ADMIN_PASS');

    if (
      adminEmail &&
      adminPass &&
      loginDto.email === adminEmail &&
      loginDto.password === adminPass
    ) {
      return this.buildAdminLoginResponse(adminEmail);
    }

    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!this.usersService.hasPasswordConfigured(user)) {
      throw new UnauthorizedException(
        'La cuenta todavía no activó su contraseña',
      );
    }

    const validPassword = this.usersService.verifyPassword(
      loginDto.password,
      user.passwordHash,
    );
    if (!validPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.buildUserLoginResponse(user);
  }

  async resolveSetupToken(token: string) {
    const user = await this.usersService.findByPasswordSetupToken(token);
    if (!user || !user.passwordSetupExpiresAt) {
      throw new UnauthorizedException('Token inválido');
    }

    if (user.passwordSetupExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Token expirado');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        institutionId: user.institutionId,
        institutionName: user.institution?.name ?? null,
      },
      expiresAt: user.passwordSetupExpiresAt,
    };
  }

  async setupPassword(token: string, password: string) {
    const user = await this.usersService.setupPassword(token, password);
    return this.buildUserLoginResponse(user);
  }

  private buildAdminLoginResponse(adminEmail: string) {
    const payload = {
      email: adminEmail,
      sub: '1',
      role: UserRole.ADMIN,
      institutionId: null,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: '1',
        email: adminEmail,
        name: 'Administrador',
        role: UserRole.ADMIN,
        institutionId: null,
      },
      tokens: {
        accessToken,
      },
    };
  }

  private buildUserLoginResponse(user: User) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      institutionId: user.institutionId ?? null,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        institutionId: user.institutionId ?? null,
      },
      tokens: {
        accessToken,
      },
    };
  }
}

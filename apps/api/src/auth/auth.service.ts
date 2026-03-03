import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const adminEmail = this.configService.get<string>('ADMIN_USER') || 'admin@akit.app';
    const adminPass = this.configService.get<string>('ADMIN_PASS') || 'admin123';

    if (loginDto.email !== adminEmail || loginDto.password !== adminPass) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { email: adminEmail, sub: 1, role: 'admin' };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: '1',
        email: adminEmail,
        name: 'Administrador',
        role: 'admin',
      },
      tokens: {
        accessToken,
      },
    };
  }
}

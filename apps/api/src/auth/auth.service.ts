import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(loginDto: LoginDto) {
    const adminEmail = process.env.ADMIN_USER || 'admin@akit.app';
    const adminPass = process.env.ADMIN_PASS || 'admin123';

    if (loginDto.email !== adminEmail || loginDto.password !== adminPass) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { email: adminEmail, sub: 1, role: 'admin' };
    const accessToken = this.jwtService.sign(payload);

    // Respuesta compatible con el AuthContext del Frontend
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

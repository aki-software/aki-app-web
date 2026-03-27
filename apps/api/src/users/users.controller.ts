import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(
    @Body()
    payload: {
      name: string;
      role?: UserRole;
      email?: string;
      institutionId?: string | null;
    },
  ) {
    const user = await this.usersService.register(
      payload.name,
      payload.role ?? UserRole.THERAPIST,
      payload.email,
      payload.institutionId,
    );
    return {
      user_id: user.id,
      status: 'registered',
    };
  }
}

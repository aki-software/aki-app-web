import { Controller, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class V1UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body() payload: { name: string; role: string }) {
    const user = await this.usersService.register(payload.name, payload.role);
    return {
      user_id: user.id,
      status: 'registered',
    };
  }
}

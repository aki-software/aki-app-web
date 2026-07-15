import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../users/entities/user.entity.js';
import { TresAreasService } from './tres-areas.service.js';
import { UpdateTresAreasDto } from './dto/update-tres-areas.dto.js';

@Controller('tres-areas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TresAreasController {
  constructor(private readonly tresAreasService: TresAreasService) {}

  @Get('combinations')
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '20', 10) || 20),
    );

    return this.tresAreasService.findAll(pageNum, limitNum, search ?? '');
  }

  @Put('combinations/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateTresAreasDto) {
    const result = await this.tresAreasService.update(id, dto);
    await this.tresAreasService.reloadCache();

    return result;
  }
}

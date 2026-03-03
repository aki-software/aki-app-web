import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendReportDto } from './dto/send-report.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.create(createSessionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.sessionsService.findAll(parsedPage, parsedLimit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.sessionsService.findOne(id);
    } catch (e) {
      throw new NotFoundException(e.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/send-report')
  async sendReport(
    @Param('id') id: string,
    @Body() sendReportDto: SendReportDto,
  ) {
    return await this.sessionsService.sendReport(id, sendReportDto.email);
  }
}

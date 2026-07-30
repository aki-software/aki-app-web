import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../users/entities/user.entity.js';
import { CreateInstitutionDto } from './dto/create-institution.dto.js';
import { CreateOperationalAccountDto } from './dto/create-operational-account.dto.js';
import { InstitutionOverviewQueryDto } from './dto/institution-overview-query.dto.js';
import { UpdateInstitutionDto } from './dto/update-institution.dto.js';
import { UpdateInstitutionStatusDto } from './dto/update-institution-status.dto.js';
import { InstitutionsService } from './institutions.service.js';
import type {
  InstitutionOverviewResponse,
  PaginatedResponse,
  InstitutionOption,
  PreSignedUrlResponse,
} from '@akit/contracts';
import { StorageService } from '../common/services/storage.service.js';
import { InstitutionAnalyticsService } from './services/institution-analytics.service.js';
import { InstitutionOperationalAccountService } from './services/institution-operational-account.service.js';
import { InstitutionPresenterService } from './services/institution-presenter.service.js';
import { InstitutionOwnerGuard } from './guards/institution-owner.guard.js';

@Controller('institutions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstitutionsController {
  constructor(
    private readonly institutionsService: InstitutionsService,
    private readonly institutionAnalyticsService: InstitutionAnalyticsService,
    private readonly institutionOperationalAccountService: InstitutionOperationalAccountService,
    private readonly institutionPresenterService: InstitutionPresenterService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<PaginatedResponse<InstitutionOption>> {
    const institutions = await this.institutionsService.findAll();
    return {
      data: institutions.map((institution) =>
        this.institutionPresenterService.toInstitutionListItemResponse(
          institution,
        ),
      ),
      count: institutions.length,
      page: 1,
      limit: institutions.length,
    };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() payload: CreateInstitutionDto,
  ): Promise<InstitutionOption & { activationEmailSent: boolean }> {
    const { institution, activationEmailSent } =
      await this.institutionOperationalAccountService.createInstitutionWithOperationalAccount(
        payload,
      );

    return {
      ...this.institutionPresenterService.toInstitutionListItemResponse(
        institution,
      ),
      activationEmailSent,
    };
  }

  @Get(':id/stats')
  @UseGuards(InstitutionOwnerGuard)
  async getStats(@Param('id') id: string) {
    return await this.institutionAnalyticsService.getStats(id);
  }

  @Get(':id/overview')
  @UseGuards(InstitutionOwnerGuard)
  async getOverview(
    @Param('id') id: string,
    @Query() query?: InstitutionOverviewQueryDto,
  ): Promise<InstitutionOverviewResponse> {
    const normalizedDays = query?.periodDays ?? 7;

    return (await this.institutionAnalyticsService.getOverview(
      id,
      normalizedDays,
    )) as InstitutionOverviewResponse;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() payload: UpdateInstitutionDto) {
    const institution = await this.institutionsService.update(id, payload);
    return this.institutionPresenterService.toInstitutionResponse(institution);
  }

  @Post(':id/logo/upload-url')
  @UseGuards(InstitutionOwnerGuard)
  async generateLogoUploadUrl(
    @Param('id') id: string,
    @Body('mimeType') mimeType: string = 'image/png',
  ): Promise<PreSignedUrlResponse> {
    if (!['image/png', 'image/jpeg'].includes(mimeType)) {
      throw new BadRequestException(
        'Formato de imagen no soportado (solo PNG o JPEG)',
      );
    }

    const ext = mimeType.split('/')[1];
    const fileKey = `institutions/${id}/logo/${Date.now()}.${ext}`;

    const uploadUrl = await this.storageService.getPresignedUploadUrl(
      fileKey,
      mimeType,
      300, // 5 minutes
    );

    if (!uploadUrl) {
      throw new InternalServerErrorException(
        'Error al generar la URL de subida',
      );
    }

    return { uploadUrl, fileKey };
  }

  @Patch(':id/logo')
  @UseGuards(InstitutionOwnerGuard)
  async updateLogo(@Param('id') id: string, @Body('fileKey') fileKey: string) {
    if (!fileKey || typeof fileKey !== 'string') {
      throw new BadRequestException('fileKey es requerido y debe ser un texto');
    }

    await this.institutionsService.updateLogo(id, fileKey);
    return { success: true };
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateInstitutionStatusDto,
  ) {
    const institution = await this.institutionsService.updateStatus(
      id,
      payload.isActive,
    );
    return {
      id: institution.id,
      isActive: institution.isActive,
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.institutionsService.softRemove(id);
  }

  @Delete(':id/therapists/:therapistId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTherapist(
    @Param('id') id: string,
    @Param('therapistId') therapistId: string,
  ): Promise<void> {
    await this.institutionsService.removeTherapist(id, therapistId);
  }

  @Post(':id/operational-account')
  @Roles(UserRole.ADMIN)
  async createOperationalAccount(
    @Param('id') id: string,
    @Body() payload: CreateOperationalAccountDto,
  ): Promise<InstitutionOption & { activationEmailSent: boolean }> {
    const { institution, activationEmailSent } =
      await this.institutionOperationalAccountService.createOperationalAccount(
        id,
        payload.email,
      );

    return {
      ...this.institutionPresenterService.toInstitutionListItemResponse(
        institution,
      ),
      activationEmailSent,
    };
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { CreateOperationalAccountDto } from './dto/create-operational-account.dto';
import { InstitutionOverviewQueryDto } from './dto/institution-overview-query.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { UpdateInstitutionStatusDto } from './dto/update-institution-status.dto';
import { InstitutionsService } from './institutions.service';
import type {
  InstitutionCreateResponse,
  InstitutionOperationalAccountResponse,
  InstitutionsListResponse,
  InstitutionStatusResponse,
} from './institutions.types';
import { InstitutionAnalyticsService } from './services/institution-analytics.service';
import { InstitutionOperationalAccountService } from './services/institution-operational-account.service';
import { InstitutionPresenterService } from './services/institution-presenter.service';

@Controller('institutions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstitutionsController {
  constructor(
    private readonly institutionsService: InstitutionsService,
    private readonly institutionAnalyticsService: InstitutionAnalyticsService,
    private readonly institutionOperationalAccountService: InstitutionOperationalAccountService,
    private readonly institutionPresenterService: InstitutionPresenterService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<InstitutionsListResponse> {
    const institutions = await this.institutionsService.findAll();
    return {
      data: institutions.map((institution) =>
        this.institutionPresenterService.toInstitutionListItemResponse(
          institution,
        ),
      ),
    };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() payload: CreateInstitutionDto,
  ): Promise<InstitutionCreateResponse> {
    const { institution, activationEmailSent } =
      await this.institutionOperationalAccountService.createInstitutionWithOperationalAccount(
        payload,
      );

    return {
      ...this.institutionPresenterService.toInstitutionResponse(institution),
      activationEmailSent,
    };
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string, @Req() req?: AuthenticatedRequest) {
    this.assertOwnerOrAdmin(req, id);

    return await this.institutionAnalyticsService.getStats(id);
  }

  @Get(':id/overview')
  async getOverview(
    @Param('id') id: string,
    @Req() req?: AuthenticatedRequest,
    @Query() query?: InstitutionOverviewQueryDto,
  ) {
    this.assertOwnerOrAdmin(req, id);

    const normalizedDays = query?.days ?? 7;

    return await this.institutionAnalyticsService.getOverview(
      id,
      normalizedDays,
    );
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() payload: UpdateInstitutionDto) {
    const institution = await this.institutionsService.update(id, payload);
    return this.institutionPresenterService.toInstitutionResponse(institution);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateInstitutionStatusDto,
  ): Promise<InstitutionStatusResponse> {
    const institution = await this.institutionsService.updateStatus(
      id,
      payload.isActive,
    );
    return {
      id: institution.id,
      isActive: institution.isActive,
    };
  }

  @Post(':id/operational-account')
  @Roles(UserRole.ADMIN)
  async createOperationalAccount(
    @Param('id') id: string,
    @Body() payload: CreateOperationalAccountDto,
  ): Promise<InstitutionOperationalAccountResponse> {
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

  private assertOwnerOrAdmin(
    req: AuthenticatedRequest | undefined,
    institutionId: string,
  ): void {
    const isOwnerOrAdmin =
      req?.user?.role?.toUpperCase() === UserRole.ADMIN ||
      req?.user?.institutionId === institutionId;

    if (!isOwnerOrAdmin) {
      throw new UnauthorizedException(
        'No tienes permisos para acceder a esta institución',
      );
    }
  }
}

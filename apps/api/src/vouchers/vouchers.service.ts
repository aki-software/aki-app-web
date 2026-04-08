import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherBatch } from './entities/voucher-batch.entity';
import {
  VoucherBatchStatus,
  VoucherOwnerType,
  VoucherStatus,
} from './entities/voucher.enums';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { ListVouchersDto } from './dto/list-vouchers.dto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { ListVoucherBatchesDto } from './dto/list-voucher-batches.dto';

type VoucherScope = {
  role?: string;
  ownerUserId?: string;
  ownerInstitutionId?: string | null;
};

type VoucherBatchSummary = {
  batchId: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  createdAt: Date | string;
  expiresAt: Date | string | null;
  total: number;
  available: number;
  used: number;
  pending: number;
};

type VoucherBatchDetailItem = {
  id: string;
  code: string;
  status: VoucherStatus;
  assignedPatientName: string | null;
  assignedPatientEmail: string | null;
  redeemedSessionId: string | null;
  createdAt: Date | string;
  redeemedAt: Date | string | null;
  expiresAt: Date | string | null;
};

type VoucherBatchDetail = {
  batchId: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  createdAt: Date | string;
  expiresAt: Date | string | null;
  total: number;
  available: number;
  used: number;
  pending: number;
  vouchers: VoucherBatchDetailItem[];
};

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(VoucherBatch)
    private readonly voucherBatchRepository: Repository<VoucherBatch>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async create(createVoucherDto: CreateVoucherDto): Promise<{
    batchId: string;
    createdCount: number;
    codes: string[];
    ownerType: VoucherOwnerType;
    ownerUserId: string | null;
    ownerInstitutionId: string | null;
    expiresAt: Date | null;
  }> {
    const normalizedOwnership = await this.normalizeOwner(
      createVoucherDto.ownerType,
      createVoucherDto.ownerUserId,
      createVoucherDto.ownerInstitutionId,
    );
    const quantity = createVoucherDto.quantity ?? 1;
    if (quantity > 1 && createVoucherDto.code) {
      throw new BadRequestException(
        'No se puede definir un código manual cuando se crea un lote',
      );
    }
    const batch = await this.voucherBatchRepository.save(
      this.voucherBatchRepository.create({
        ownerType: normalizedOwnership.ownerType,
        ownerUserId: normalizedOwnership.ownerUserId,
        ownerInstitutionId: normalizedOwnership.ownerInstitutionId,
        quantity,
        unitPrice: '0',
        totalPrice: '0',
        status: VoucherBatchStatus.PAID,
        paidAt: new Date(),
      }),
    );
    const expiresAt = createVoucherDto.expiresAt
      ? new Date(createVoucherDto.expiresAt)
      : null;
    const vouchersToCreate: Voucher[] = [];
    for (let index = 0; index < quantity; index++) {
      vouchersToCreate.push(
        this.voucherRepository.create({
          code: this.normalizeCode(
            createVoucherDto.code ?? (await this.generateVoucherCode()),
          ),
          batchId: batch.id,
          ownerType: normalizedOwnership.ownerType,
          ownerUserId: normalizedOwnership.ownerUserId,
          ownerInstitutionId: normalizedOwnership.ownerInstitutionId,
          status: VoucherStatus.AVAILABLE,
          assignedPatientName: createVoucherDto.assignedPatientName ?? null,
          assignedPatientEmail: createVoucherDto.assignedPatientEmail ?? null,
          expiresAt,
        }),
      );
    }
    const savedVouchers = await this.voucherRepository.save(vouchersToCreate);
    return {
      batchId: batch.id,
      createdCount: savedVouchers.length,
      codes: savedVouchers.map((voucher) => voucher.code),
      ownerType: normalizedOwnership.ownerType,
      ownerUserId: normalizedOwnership.ownerUserId,
      ownerInstitutionId: normalizedOwnership.ownerInstitutionId,
      expiresAt,
    };
  }

  async sendEmail(id: string, customEmail?: string): Promise<boolean> {
    const voucher = await this.voucherRepository.findOne({ where: { id } });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');
    this.assertVoucherCanSendEmail(voucher);
    const targetEmail = customEmail || voucher.assignedPatientEmail;
    if (!targetEmail) {
      throw new BadRequestException(
        'Se requiere un correo de destino para enviar el voucher',
      );
    }
    const delivered = await this.mailService.sendVoucherCode(
      targetEmail,
      voucher.code,
      voucher.assignedPatientName || undefined,
    );
    if (!delivered) {
      return false;
    }

    voucher.sentAt = new Date();
    if (voucher.status === VoucherStatus.AVAILABLE) {
      voucher.status = VoucherStatus.SENT;
    }
    if (customEmail?.trim()) {
      voucher.assignedPatientEmail = customEmail.trim();
    }
    await this.voucherRepository.save(voucher);
    return true;
  }

  async resendEmail(id: string, customEmail?: string): Promise<boolean> {
    return await this.sendEmail(id, customEmail);
  }

  async revoke(id: string): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({ where: { id } });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');
    this.assertVoucherCanBeRevoked(voucher);
    voucher.revoke();
    return await this.voucherRepository.save(voucher);
  }

  async findById(id: string): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({
      where: { id },
      relations: ['ownerUser', 'ownerInstitution'],
    });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');
    return voucher;
  }

  async resolveAvailableVoucher(code: string): Promise<Voucher> {
    const voucher = await this.findByCode(code);
    this.assertVoucherAvailable(voucher);
    return voucher;
  }

  async attachVoucherToSession(
    code: string,
    sessionId: string,
    patientName?: string | null,
  ): Promise<Voucher> {
    const voucher = await this.resolveAvailableVoucher(code);
    voucher.status = VoucherStatus.USED;
    voucher.redeemedSessionId = sessionId;
    voucher.redeemedAt = new Date();
    if (patientName && !voucher.assignedPatientName) {
      voucher.assignedPatientName = patientName;
    }
    return await this.voucherRepository.save(voucher);
  }

  async findAll(
    scope?: VoucherScope,
  ): Promise<{ data: Voucher[]; count: number }> {
    const where = this.buildScopedWhere(scope);
    const [data, count] = await this.voucherRepository.findAndCount({
      where,
      relations: ['ownerUser', 'ownerInstitution', 'redeemedSession'],
      order: { createdAt: 'DESC' },
    });
    return { data, count };
  }

  async findAllFiltered(
    filters: ListVouchersDto,
    scope?: VoucherScope,
  ): Promise<{
    data: Voucher[];
    count: number;
    page?: number;
    limit?: number;
  }> {
    const hasAdvancedFilters = Boolean(
      filters.search?.trim() ||
      filters.status ||
      filters.clientId ||
      filters.expiration ||
      filters.page ||
      filters.limit,
    );

    const where = this.buildScopedWhere(scope);
    const vouchers = await this.voucherRepository.find({
      where,
      relations: ['ownerUser', 'ownerInstitution', 'redeemedSession'],
      order: { createdAt: 'DESC' },
    });

    const now = Date.now();
    const next7Days = now + 7 * 24 * 60 * 60 * 1000;
    const normalizedSearch = filters.search?.trim().toLowerCase() ?? '';

    const filtered = vouchers.filter((voucher) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          voucher.code,
          voucher.status,
          voucher.batchId,
          voucher.ownerInstitution?.name,
          voucher.ownerUser?.name,
          voucher.assignedPatientName,
          voucher.assignedPatientEmail,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch),
          );

      const matchesStatus =
        !filters.status || voucher.status === filters.status;

      const voucherClientId = voucher.ownerInstitutionId ?? '__UNASSIGNED__';
      const targetClientId = filters.clientId?.trim();
      const matchesClient =
        !targetClientId || voucherClientId === targetClientId;

      const expiresAtTimestamp = voucher.expiresAt
        ? new Date(voucher.expiresAt).getTime()
        : NaN;
      const hasValidExpiration = Number.isFinite(expiresAtTimestamp);
      const matchesExpiration =
        !filters.expiration ||
        filters.expiration === 'ALL' ||
        (filters.expiration === 'EXPIRING_7D' &&
          hasValidExpiration &&
          expiresAtTimestamp >= now &&
          expiresAtTimestamp <= next7Days) ||
        (filters.expiration === 'NO_EXPIRATION' && !hasValidExpiration);

      return (
        matchesSearch && matchesStatus && matchesClient && matchesExpiration
      );
    });

    if (!hasAdvancedFilters) {
      return { data: filtered, count: filtered.length };
    }

    const page = Number.isFinite(filters.page)
      ? Math.max(1, filters.page ?? 1)
      : 1;
    const limit = Number.isFinite(filters.limit)
      ? Math.min(Math.max(1, filters.limit ?? 10), 100)
      : 10;
    const startIndex = (page - 1) * limit;

    return {
      data: filtered.slice(startIndex, startIndex + limit),
      count: filtered.length,
      page,
      limit,
    };
  }

  async findBatchSummaries(
    filters: ListVoucherBatchesDto,
    scope?: VoucherScope,
  ): Promise<{
    data: VoucherBatchSummary[];
    count: number;
    page: number;
    limit: number;
  }> {
    const where = this.buildScopedWhere(scope);
    const page = Number.isFinite(filters.page)
      ? Math.max(1, filters.page ?? 1)
      : 1;
    const limit = Number.isFinite(filters.limit)
      ? Math.min(Math.max(1, filters.limit ?? 10), 100)
      : 10;

    const vouchers = await this.voucherRepository.find({
      where,
      relations: ['ownerUser', 'ownerInstitution'],
      order: { createdAt: 'DESC' },
    });

    const now = Date.now();
    const next7Days = now + 7 * 24 * 60 * 60 * 1000;
    const normalizedSearch = filters.search?.trim().toLowerCase() ?? '';

    const filteredVouchers = vouchers.filter((voucher) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          voucher.batchId,
          voucher.code,
          voucher.ownerInstitution?.name,
          voucher.ownerUser?.name,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch),
          );

      const voucherClientId = voucher.ownerInstitutionId ?? '__UNASSIGNED__';
      const targetClientId = filters.clientId?.trim();
      const matchesClient =
        !targetClientId || voucherClientId === targetClientId;

      const expiresAtTimestamp = voucher.expiresAt
        ? new Date(voucher.expiresAt).getTime()
        : NaN;
      const hasValidExpiration = Number.isFinite(expiresAtTimestamp);
      const matchesExpiration =
        !filters.expiration ||
        filters.expiration === 'ALL' ||
        (filters.expiration === 'EXPIRING_7D' &&
          hasValidExpiration &&
          expiresAtTimestamp >= now &&
          expiresAtTimestamp <= next7Days) ||
        (filters.expiration === 'NO_EXPIRATION' && !hasValidExpiration);

      return matchesSearch && matchesClient && matchesExpiration;
    });

    const grouped = new Map<string, VoucherBatchSummary>();
    filteredVouchers.forEach((voucher) => {
      const pendingIncrement =
        voucher.status === VoucherStatus.USED ||
        voucher.status === VoucherStatus.EXPIRED
          ? 0
          : 1;

      const existing = grouped.get(voucher.batchId);
      if (!existing) {
        grouped.set(voucher.batchId, {
          batchId: voucher.batchId,
          ownerInstitutionName:
            voucher.ownerInstitution?.name ?? 'Cliente no informado',
          ownerUserName: voucher.ownerUser?.name ?? 'Responsable no informado',
          createdAt: voucher.createdAt,
          expiresAt: voucher.expiresAt,
          total: 1,
          available: voucher.status === VoucherStatus.AVAILABLE ? 1 : 0,
          used: voucher.status === VoucherStatus.USED ? 1 : 0,
          pending: pendingIncrement,
        });
        return;
      }

      existing.total += 1;
      if (voucher.status === VoucherStatus.AVAILABLE) existing.available += 1;
      if (voucher.status === VoucherStatus.USED) existing.used += 1;
      existing.pending += pendingIncrement;
    });

    const summaries = Array.from(grouped.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const startIndex = (page - 1) * limit;
    const data = summaries.slice(startIndex, startIndex + limit);

    return {
      data,
      count: summaries.length,
      page,
      limit,
    };
  }

  async findBatchDetail(
    batchId: string,
    scope?: VoucherScope,
  ): Promise<VoucherBatchDetail> {
    const where = this.buildScopedWhere(scope);
    const scopedWhere = where
      ? ({ ...where, batchId } as FindOptionsWhere<Voucher>)
      : ({ batchId } as FindOptionsWhere<Voucher>);

    const vouchers = await this.voucherRepository.find({
      where: scopedWhere,
      relations: ['ownerUser', 'ownerInstitution'],
      order: { createdAt: 'DESC' },
    });

    if (vouchers.length === 0) {
      throw new NotFoundException('Lote no encontrado');
    }

    const firstVoucher = vouchers[0];
    const available = vouchers.filter(
      (voucher) => voucher.status === VoucherStatus.AVAILABLE,
    ).length;
    const used = vouchers.filter(
      (voucher) => voucher.status === VoucherStatus.USED,
    ).length;
    const pending = vouchers.filter(
      (voucher) =>
        voucher.status !== VoucherStatus.USED &&
        voucher.status !== VoucherStatus.EXPIRED,
    ).length;

    return {
      batchId,
      ownerInstitutionName:
        firstVoucher.ownerInstitution?.name ?? 'Cliente no informado',
      ownerUserName: firstVoucher.ownerUser?.name ?? 'Responsable no informado',
      createdAt: firstVoucher.createdAt,
      expiresAt: firstVoucher.expiresAt,
      total: vouchers.length,
      available,
      used,
      pending,
      vouchers: vouchers.map((voucher) => ({
        id: voucher.id,
        code: voucher.code,
        status: voucher.status,
        assignedPatientName: voucher.assignedPatientName,
        assignedPatientEmail: voucher.assignedPatientEmail,
        redeemedSessionId: voucher.redeemedSessionId,
        createdAt: voucher.createdAt,
        redeemedAt: voucher.redeemedAt,
        expiresAt: voucher.expiresAt,
      })),
    };
  }

  async findByCode(code: string): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({
      where: { code: this.normalizeCode(code) },
      relations: ['ownerUser', 'ownerInstitution'],
    });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');
    return voucher;
  }

  private assertVoucherAvailable(voucher: Voucher) {
    if (voucher.status !== VoucherStatus.AVAILABLE)
      throw new BadRequestException('Voucher no disponible');
    if (voucher.expiresAt && voucher.expiresAt.getTime() < Date.now())
      throw new BadRequestException('Voucher expirado');
  }

  private assertVoucherCanSendEmail(voucher: Voucher) {
    if (
      voucher.status === VoucherStatus.USED ||
      voucher.status === VoucherStatus.EXPIRED ||
      voucher.status === VoucherStatus.REVOKED
    ) {
      throw new BadRequestException(
        'El voucher no admite envío en su estado actual',
      );
    }
    if (voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El voucher está vencido');
    }
  }

  private assertVoucherCanBeRevoked(voucher: Voucher) {
    if (
      voucher.status !== VoucherStatus.AVAILABLE &&
      voucher.status !== VoucherStatus.SENT
    ) {
      throw new BadRequestException(
        'Solo se pueden revocar vouchers disponibles o enviados',
      );
    }
  }

  private async normalizeOwner(
    ownerType?: VoucherOwnerType,
    ownerUserId?: string | null,
    ownerInstitutionId?: string | null,
  ) {
    if (!ownerType)
      throw new BadRequestException('ownerType es obligatorio para vouchers');
    if (ownerType === VoucherOwnerType.THERAPIST && !ownerUserId)
      throw new BadRequestException(
        'ownerUserId es obligatorio para vouchers de terapeuta',
      );
    if (ownerType === VoucherOwnerType.THERAPIST && ownerUserId) {
      const therapist =
        await this.usersService.ensureInstitutionOwner(ownerUserId);
      return {
        ownerType: VoucherOwnerType.INSTITUTION,
        ownerUserId: therapist.id,
        ownerInstitutionId: therapist.institutionId,
      };
    }
    if (ownerType === VoucherOwnerType.INSTITUTION && !ownerInstitutionId)
      throw new BadRequestException(
        'ownerInstitutionId es obligatorio para vouchers de institución',
      );
    return {
      ownerType,
      ownerUserId: ownerUserId ?? null,
      ownerInstitutionId: ownerInstitutionId ?? null,
    };
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private async generateVoucherCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const raw = randomBytes(6).toString('base64url').toUpperCase();
      const code = raw.replace(/[^A-Z0-9]/g, '').slice(0, 10);
      if (code.length < 8) continue;
      const existing = await this.voucherRepository.findOne({
        where: { code },
      });
      if (!existing) return code;
    }
    throw new BadRequestException(
      'No se pudo generar un código de voucher único',
    );
  }

  private buildScopedWhere(
    scope?: VoucherScope,
  ): FindOptionsWhere<Voucher> | undefined {
    const normalizedRole = scope?.role?.toUpperCase();
    if (normalizedRole === 'ADMIN')
      return scope?.ownerInstitutionId
        ? { ownerInstitutionId: scope.ownerInstitutionId }
        : undefined;
    if (scope?.ownerInstitutionId)
      return { ownerInstitutionId: scope.ownerInstitutionId };
    if (scope?.ownerUserId) return { ownerUserId: scope.ownerUserId };
    return { id: '__forbidden__' };
  }
}

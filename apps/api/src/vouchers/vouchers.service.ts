import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, FindOptionsWhere, Repository } from 'typeorm';
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
import { Session, SessionPaymentStatus } from '../sessions/entities/session.entity';

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

type RawVoucherBatchCountRow = { count: string };
type RawVoucherBatchSummaryRow = {
  batchId: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  createdAt: Date | string;
  expiresAt: Date | string | null;
  total: string;
  available: string;
  used: string;
  pending: string;
};

@Injectable()
export class VouchersService {
  private readonly logger = new Logger(VouchersService.name);

  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(VoucherBatch)
    private readonly voucherBatchRepository: Repository<VoucherBatch>,
    private readonly dataSource: DataSource,
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

  async redeemForSession(code: string, sessionId: string): Promise<{
    success: boolean;
    status: 'REDEEMED' | 'ALREADY_REDEEMED_BY_THIS_SESSION';
    voucherCode: string;
    sessionId: string;
  }> {
    const normalizedCode = this.normalizeCode(code);
    this.logger.debug(
      `redeemForSession start code=${normalizedCode} sessionId=${sessionId}`,
    );

    return await this.dataSource.transaction(async (manager) => {
      const voucherRepository = manager.getRepository(Voucher);
      const sessionRepository = manager.getRepository(Session);

      const voucher = await voucherRepository.findOne({
        where: { code: normalizedCode },
      });
      if (!voucher) {
        this.logger.warn(
          `redeemForSession voucher-not-found code=${normalizedCode} sessionId=${sessionId}`,
        );
        throw new NotFoundException('INVALID_CODE');
      }

      this.logger.debug(
        `redeemForSession voucher-loaded id=${voucher.id} status=${voucher.status} ownerUserId=${voucher.ownerUserId ?? 'null'} ownerInstitutionId=${voucher.ownerInstitutionId ?? 'null'} redeemedSessionId=${voucher.redeemedSessionId ?? 'null'}`,
      );

      const session = await sessionRepository.findOne({ where: { id: sessionId } });
      if (!session) {
        this.logger.warn(
          `redeemForSession session-not-found code=${normalizedCode} sessionId=${sessionId}`,
        );
        throw new NotFoundException('SESSION_NOT_FOUND');
      }

      this.logger.debug(
        `redeemForSession session-loaded id=${session.id} patientId=${session.patientId ?? 'null'} therapistUserId=${session.therapistUserId ?? 'null'} institutionId=${session.institutionId ?? 'null'} paymentStatus=${session.paymentStatus}`,
      );

      if (voucher.redeemedSessionId === sessionId) {
        this.logger.debug(
          `redeemForSession already-redeemed-same-session code=${normalizedCode} sessionId=${sessionId}`,
        );
        this.applyVoucherRedemptionToSession(session, voucher, new Date());
        await sessionRepository.save(session);
        return {
          success: true,
          status: 'ALREADY_REDEEMED_BY_THIS_SESSION' as const,
          voucherCode: voucher.code,
          sessionId,
        };
      }

      if (voucher.status === VoucherStatus.USED) {
        this.logger.warn(
          `redeemForSession voucher-already-used code=${normalizedCode} voucherId=${voucher.id} redeemedSessionId=${voucher.redeemedSessionId ?? 'null'} requestedSessionId=${sessionId}`,
        );
        throw new ConflictException('ALREADY_USED');
      }

      this.assertVoucherAvailable(voucher);
      const redeemedAt = new Date();
      voucher.status = VoucherStatus.USED;
      voucher.redeemedSessionId = sessionId;
      voucher.redeemedAt = redeemedAt;

      this.applyVoucherRedemptionToSession(session, voucher, redeemedAt);

      await voucherRepository.save(voucher);
      await sessionRepository.save(session);

      this.logger.log(
        `redeemForSession success code=${normalizedCode} voucherId=${voucher.id} sessionId=${sessionId}`,
      );

      return {
        success: true,
        status: 'REDEEMED' as const,
        voucherCode: voucher.code,
        sessionId,
      };
    });
  }

  private applyVoucherRedemptionToSession(
    session: Session,
    voucher: Voucher,
    redeemedAt: Date,
  ) {
    session.voucherId = voucher.id;
    session.paymentStatus = SessionPaymentStatus.VOUCHER_REDEEMED;
    session.reportUnlockedAt = session.reportUnlockedAt ?? redeemedAt;
    if (!session.institutionId && voucher.ownerInstitutionId) {
      session.institutionId = voucher.ownerInstitutionId;
    }
    if (!session.therapistUserId && voucher.ownerUserId) {
      session.therapistUserId = voucher.ownerUserId;
    }
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
    page: number;
    limit: number;
  }> {
    const page = Number.isFinite(filters.page)
      ? Math.max(1, filters.page ?? 1)
      : 1;
    const limit = Number.isFinite(filters.limit)
      ? Math.min(Math.max(1, filters.limit ?? 10), 100)
      : 10;

    const qb = this.voucherRepository
      .createQueryBuilder('voucher')
      .leftJoinAndSelect('voucher.ownerUser', 'ownerUser')
      .leftJoinAndSelect('voucher.ownerInstitution', 'ownerInstitution')
      .leftJoinAndSelect('voucher.redeemedSession', 'redeemedSession')
      .orderBy('voucher.createdAt', 'DESC');

    const normalizedRole = scope?.role?.toUpperCase();
    if (normalizedRole === 'ADMIN') {
      if (scope?.ownerInstitutionId) {
        qb.andWhere('voucher.ownerInstitutionId = :ownerInstitutionId', {
          ownerInstitutionId: scope.ownerInstitutionId,
        });
      }
    } else if (scope?.ownerInstitutionId) {
      qb.andWhere('voucher.ownerInstitutionId = :ownerInstitutionId', {
        ownerInstitutionId: scope.ownerInstitutionId,
      });
    } else if (scope?.ownerUserId) {
      qb.andWhere('voucher.ownerUserId = :ownerUserId', {
        ownerUserId: scope.ownerUserId,
      });
    } else {
      qb.andWhere('voucher.id = :forbidden', { forbidden: '__forbidden__' });
    }

    const search = filters.search?.trim();
    if (search) {
      const normalized = `%${search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((inner) => {
          inner
            .where('LOWER(voucher.code) LIKE :search', { search: normalized })
            .orWhere('LOWER(CAST(voucher.status AS text)) LIKE :search', {
              search: normalized,
            })
            .orWhere('LOWER(CAST(voucher.batchId AS text)) LIKE :search', {
              search: normalized,
            })
            .orWhere('LOWER(ownerInstitution.name) LIKE :search', {
              search: normalized,
            })
            .orWhere('LOWER(ownerUser.name) LIKE :search', {
              search: normalized,
            })
            .orWhere(
              "LOWER(COALESCE(voucher.assignedPatientName, '')) LIKE :search",
              { search: normalized },
            )
            .orWhere(
              "LOWER(COALESCE(voucher.assignedPatientEmail, '')) LIKE :search",
              { search: normalized },
            );
        }),
      );
    }

    if (filters.status) {
      qb.andWhere('voucher.status = :status', { status: filters.status });
    }

    const expiration = filters.expiration?.trim();
    if (expiration && expiration !== 'ALL') {
      if (expiration === 'EXPIRING_7D') {
        const now = new Date();
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        qb.andWhere('voucher.expiresAt IS NOT NULL')
          .andWhere('voucher.expiresAt >= :now', { now })
          .andWhere('voucher.expiresAt <= :next7Days', { next7Days });
      } else if (expiration === 'NO_EXPIRATION') {
        qb.andWhere('voucher.expiresAt IS NULL');
      }
    }

    const [data, count] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, count, page, limit };
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
    const page = Number.isFinite(filters.page)
      ? Math.max(1, filters.page ?? 1)
      : 1;
    const limit = Number.isFinite(filters.limit)
      ? Math.min(Math.max(1, filters.limit ?? 10), 100)
      : 10;

    const baseQb = this.voucherRepository
      .createQueryBuilder('voucher')
      .leftJoin('voucher.ownerInstitution', 'ownerInstitution')
      .leftJoin('voucher.ownerUser', 'ownerUser');

    const normalizedRole = scope?.role?.toUpperCase();
    if (normalizedRole === 'ADMIN') {
      if (scope?.ownerInstitutionId) {
        baseQb.andWhere('voucher.ownerInstitutionId = :ownerInstitutionId', {
          ownerInstitutionId: scope.ownerInstitutionId,
        });
      }
    } else if (scope?.ownerInstitutionId) {
      baseQb.andWhere('voucher.ownerInstitutionId = :ownerInstitutionId', {
        ownerInstitutionId: scope.ownerInstitutionId,
      });
    } else if (scope?.ownerUserId) {
      baseQb.andWhere('voucher.ownerUserId = :ownerUserId', {
        ownerUserId: scope.ownerUserId,
      });
    } else {
      baseQb.andWhere('voucher.id = :forbidden', {
        forbidden: '__forbidden__',
      });
    }

    if (filters.clientId?.trim()) {
      baseQb.andWhere('voucher.ownerInstitutionId = :clientId', {
        clientId: filters.clientId.trim(),
      });
    }

    const search = filters.search?.trim();
    if (search) {
      const normalized = `%${search.toLowerCase()}%`;
      baseQb.andWhere(
        new Brackets((inner) => {
          inner
            .where('LOWER(CAST(voucher.batchId AS text)) LIKE :search', {
              search: normalized,
            })
            .orWhere('LOWER(voucher.code) LIKE :search', {
              search: normalized,
            })
            .orWhere('LOWER(ownerInstitution.name) LIKE :search', {
              search: normalized,
            })
            .orWhere('LOWER(ownerUser.name) LIKE :search', {
              search: normalized,
            });
        }),
      );
    }

    const expiration = filters.expiration?.trim();
    if (expiration && expiration !== 'ALL') {
      if (expiration === 'EXPIRING_7D') {
        const now = new Date();
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        baseQb
          .andWhere('voucher.expiresAt IS NOT NULL')
          .andWhere('voucher.expiresAt >= :now', { now })
          .andWhere('voucher.expiresAt <= :next7Days', { next7Days });
      } else if (expiration === 'NO_EXPIRATION') {
        baseQb.andWhere('voucher.expiresAt IS NULL');
      }
    }

    const countRow = await baseQb
      .clone()
      .select('COUNT(DISTINCT voucher.batchId)', 'count')
      .getRawOne<RawVoucherBatchCountRow>();
    const count = Number.parseInt(String(countRow?.count ?? '0'), 10) || 0;

    const rows = await baseQb
      .clone()
      .select('voucher.batchId', 'batchId')
      .addSelect(
        "COALESCE(MAX(ownerInstitution.name), 'Institución no informada')",
        'ownerInstitutionName',
      )
      .addSelect(
        "COALESCE(MAX(ownerUser.name), 'Cuenta operativa no informada')",
        'ownerUserName',
      )
      .addSelect('MIN(voucher.createdAt)', 'createdAt')
      .addSelect('MAX(voucher.expiresAt)', 'expiresAt')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN voucher.status = :available THEN 1 ELSE 0 END)`,
        'available',
      )
      .addSelect(
        `SUM(CASE WHEN voucher.status = :used THEN 1 ELSE 0 END)`,
        'used',
      )
      .addSelect(
        `SUM(CASE WHEN voucher.status = :used OR voucher.status = :expired THEN 0 ELSE 1 END)`,
        'pending',
      )
      .setParameters({
        available: VoucherStatus.AVAILABLE,
        used: VoucherStatus.USED,
        expired: VoucherStatus.EXPIRED,
      })
      .groupBy('voucher.batchId')
      .orderBy('createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<RawVoucherBatchSummaryRow>();

    const data: VoucherBatchSummary[] = (rows ?? []).map((row) => ({
      batchId: row.batchId,
      ownerInstitutionName: row.ownerInstitutionName,
      ownerUserName: row.ownerUserName,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      total: Number.parseInt(String(row.total ?? '0'), 10) || 0,
      available: Number.parseInt(String(row.available ?? '0'), 10) || 0,
      used: Number.parseInt(String(row.used ?? '0'), 10) || 0,
      pending: Number.parseInt(String(row.pending ?? '0'), 10) || 0,
    }));

    return { data, count, page, limit };
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
        firstVoucher.ownerInstitution?.name ?? 'Institución no informada',
      ownerUserName:
        firstVoucher.ownerUser?.name ?? 'Cuenta operativa no informada',
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
      const code = raw.replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (code.length !== 8) continue;
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

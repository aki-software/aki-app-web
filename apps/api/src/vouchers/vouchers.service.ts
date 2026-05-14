import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { Voucher } from './entities/voucher.entity.js';
import { VoucherBatch } from './entities/voucher-batch.entity.js';
import {
  VoucherBatchStatus,
  VoucherOwnerType,
  VoucherStatus,
} from './entities/voucher.enums.js';
import {
  CreateVoucherDto,
  ListVoucherBatchesDto,
  ListVouchersDto,
} from './dto/voucher.dto.js';
import {
  Session,
  SessionPaymentStatus,
} from '../sessions/entities/session.entity.js';
import { VoucherNotifierService } from './voucher-notifier.service.js';
import {
  VoucherBatchDetail,
  VoucherQueryService,
  VoucherScope,
} from './voucher-query.service.js';
import { VoucherCodeGenerator } from './services/voucher-code-generator.service.js';
import { VoucherOwnerResolver } from './services/voucher-owner-resolver.service.js';

@Injectable()
export class VouchersService {
  private readonly logger = new Logger(VouchersService.name);

  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(VoucherBatch)
    private readonly voucherBatchRepository: Repository<VoucherBatch>,
    private readonly dataSource: DataSource,
    private readonly notifierService: VoucherNotifierService,
    private readonly queryService: VoucherQueryService,
    private readonly codeGenerator: VoucherCodeGenerator,
    private readonly ownerResolver: VoucherOwnerResolver,
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
    const normalizedOwnership = await this.ownerResolver.resolve(
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
      const code = createVoucherDto.code
        ? this.codeGenerator.normalize(createVoucherDto.code)
        : await this.codeGenerator.generateUniqueCode();

      vouchersToCreate.push(
        this.voucherRepository.create({
          code,
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

  async findById(id: string, scope?: VoucherScope): Promise<Voucher> {
    const where = this.queryService.buildScopedWhere(scope);
    const scopedWhere = { ...where, id };

    const voucher = await this.voucherRepository.findOne({
      where: scopedWhere as FindOptionsWhere<Voucher>,
      relations: ['ownerUser', 'ownerInstitution'],
    });

    if (!voucher) throw new NotFoundException('Voucher no encontrado');
    return voucher;
  }

  async sendEmail(
    id: string,
    scope?: VoucherScope,
    customEmail?: string,
  ): Promise<boolean> {
    const voucher = await this.findById(id, scope);
    const targetEmail = customEmail || voucher.assignedPatientEmail;

    if (!targetEmail) {
      throw new BadRequestException(
        'Se requiere un correo de destino para enviar el voucher',
      );
    }

    try {
      voucher.markAsSent(customEmail);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }

    const delivered = await this.notifierService.sendVoucherEmail(
      voucher,
      targetEmail,
    );

    if (!delivered) return false;

    await this.voucherRepository.save(voucher);
    return true;
  }

  async resendEmail(
    id: string,
    scope?: VoucherScope,
    customEmail?: string,
  ): Promise<boolean> {
    return await this.sendEmail(id, scope, customEmail);
  }

  async revoke(id: string, scope?: VoucherScope): Promise<Voucher> {
    const voucher = await this.findById(id, scope);
    try {
      voucher.revoke();
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
    return await this.voucherRepository.save(voucher);
  }

  async resolveAvailableVoucher(code: string): Promise<Voucher> {
    const voucher = await this.findByCode(code);
    this.assertVoucherAvailable(voucher);
    return voucher;
  }

  async redeemForSession(
    code: string,
    sessionId: string,
  ): Promise<{
    success: boolean;
    status: 'REDEEMED' | 'ALREADY_REDEEMED_BY_THIS_SESSION';
    voucherCode: string;
    sessionId: string;
  }> {
    const normalizedCode = this.codeGenerator.normalize(code);
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

      const session = await sessionRepository.findOne({
        where: { id: sessionId },
      });
      if (!session) {
        this.logger.warn(
          `redeemForSession session-not-found code=${normalizedCode} sessionId=${sessionId}`,
        );
        throw new NotFoundException('SESSION_NOT_FOUND');
      }

      if (voucher.redeemedSessionId === sessionId) {
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
        throw new ConflictException('ALREADY_USED');
      }

      try {
        voucher.redeem(sessionId);
      } catch (error: any) {
        throw new BadRequestException(error.message);
      }

      this.applyVoucherRedemptionToSession(
        session,
        voucher,
        voucher.redeemedAt!,
      );

      await voucherRepository.save(voucher);
      await sessionRepository.save(session);

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

    try {
      voucher.redeem(sessionId);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }

    if (patientName && !voucher.assignedPatientName) {
      voucher.assignedPatientName = patientName;
    }
    return await this.voucherRepository.save(voucher);
  }

  async findAll(
    scope?: VoucherScope,
  ): Promise<{ data: Voucher[]; count: number }> {
    const where = this.queryService.buildScopedWhere(scope);
    const [data, count] = await this.voucherRepository.findAndCount({
      where,
      relations: ['ownerUser', 'ownerInstitution', 'redeemedSession'],
      order: { createdAt: 'DESC' },
    });
    return { data, count };
  }

  async findAllFiltered(filters: ListVouchersDto, scope?: VoucherScope) {
    return this.queryService.findAllFiltered(filters, scope);
  }

  async findBatchSummaries(
    filters: ListVoucherBatchesDto,
    scope?: VoucherScope,
  ) {
    return this.queryService.findBatchSummaries(filters, scope);
  }

  async findBatchDetail(
    batchId: string,
    scope?: VoucherScope,
  ): Promise<VoucherBatchDetail> {
    const where = this.queryService.buildScopedWhere(scope);
    const scopedWhere = { ...where, batchId } as FindOptionsWhere<Voucher>;

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
      where: { code: this.codeGenerator.normalize(code) },
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
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type EntityManager,
  type FindOptionsWhere,
  Repository,
  In,
  Between,
} from 'typeorm';
import { Voucher } from './entities/voucher.entity.js';
import { VoucherBatch } from './entities/voucher-batch.entity.js';
import {
  VoucherBatchStatus,
  VoucherOwnerType,
  VoucherStatus,
} from './entities/voucher.enums.js';
import { CreateVoucherDto } from './dto/voucher.dto.js';
import { VoucherNotifierService } from './voucher-notifier.service.js';
import { VoucherQueryService } from './voucher-query.service.js';
import { VoucherCodeGenerator } from './services/voucher-code-generator.service.js';
import { VoucherOwnerResolver } from './services/voucher-owner-resolver.service.js';
import { type VoucherScope } from './types/voucher-query.types.js';
import {
  AdminActivityItem,
  RawRecentVoucherRow,
} from '../sessions/types/dashboard.types.js';

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(VoucherBatch)
    private readonly voucherBatchRepository: Repository<VoucherBatch>,
    private readonly notifierService: VoucherNotifierService,
    private readonly queryService: VoucherQueryService,
    private readonly codeGenerator: VoucherCodeGenerator,
    private readonly ownerResolver: VoucherOwnerResolver,
  ) {}

  async getRecentActivity(limit: number = 50): Promise<AdminActivityItem[]> {
    const vouchers = await this.voucherRepository
      .createQueryBuilder('voucher')
      .select('voucher.id', 'id')
      .addSelect('voucher.code', 'code')
      .addSelect('voucher.status', 'status')
      .addSelect('voucher.createdAt', 'createdAt')
      .addSelect('voucher.sentAt', 'sentAt')
      .addSelect('voucher.redeemedAt', 'redeemedAt')
      .addSelect('ownerInstitution.name', 'ownerInstitutionName')
      .addSelect('ownerUser.name', 'ownerUserName')
      .leftJoin('voucher.ownerInstitution', 'ownerInstitution')
      .leftJoin('voucher.ownerUser', 'ownerUser')
      .orderBy('voucher.createdAt', 'DESC')
      .limit(limit)
      .getRawMany<RawRecentVoucherRow>();

    return vouchers.map((voucher) => {
      const redeemed =
        Boolean(voucher.redeemedAt) || voucher.status === VoucherStatus.USED;
      const occurredAt = redeemed
        ? this.toIso(voucher.redeemedAt, voucher.sentAt, voucher.createdAt)
        : this.toIso(voucher.sentAt, voucher.createdAt);

      return {
        id: `voucher-${voucher.id}`,
        type: redeemed ? 'VOUCHER_REDEEMED' : 'VOUCHER_ISSUED',
        title: redeemed ? 'Voucher canjeado' : 'Voucher emitido',
        description: redeemed
          ? `El código ${voucher.code} fue canjeado para ${this.describeVoucherOwner(voucher)}.`
          : `Se emitió el código ${voucher.code} para ${this.describeVoucherOwner(voucher)}.`,
        occurredAt,
      };
    });
  }

  async getExpiringSoonCount(): Promise<number> {
    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    return await this.voucherRepository.count({
      where: {
        status: In([VoucherStatus.AVAILABLE, VoucherStatus.SENT]),
        expiresAt: Between(now, weekAhead),
      },
    });
  }

  private toIso(...values: Array<Date | string | null | undefined>): string {
    for (const value of values) {
      if (!value) continue;
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    return new Date(0).toISOString();
  }

  private describeVoucherOwner(voucher: {
    ownerInstitutionName: string | null;
    ownerUserName: string | null;
  }): string {
    const institutionName = voucher.ownerInstitutionName?.trim();
    const ownerName = voucher.ownerUserName?.trim();
    return institutionName || ownerName || 'cliente no informado';
  }

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
    this.validateCreationQuantity(quantity, createVoucherDto.code);

    const expiresAt = createVoucherDto.expiresAt
      ? new Date(createVoucherDto.expiresAt)
      : null;

    const batch = await this.createBatch(normalizedOwnership, quantity);

    const vouchersToCreate = await this.prepareVouchers(
      batch.id,
      normalizedOwnership,
      quantity,
      expiresAt,
      createVoucherDto.code,
      createVoucherDto.assignedPatientName,
      createVoucherDto.assignedPatientEmail,
    );

    const savedVouchers = await this.voucherRepository.save(vouchersToCreate);

    return {
      batchId: batch.id,
      createdCount: savedVouchers.length,
      codes: savedVouchers.map((v) => v.code),
      ownerType: normalizedOwnership.ownerType,
      ownerUserId: normalizedOwnership.ownerUserId,
      ownerInstitutionId: normalizedOwnership.ownerInstitutionId,
      expiresAt,
    };
  }

  private validateCreationQuantity(quantity: number, manualCode?: string) {
    if (quantity > 1 && manualCode) {
      throw new BadRequestException(
        'No se puede definir un código manual cuando se crea un lote',
      );
    }
  }

  private async createBatch(
    ownership: {
      ownerType: VoucherOwnerType;
      ownerUserId: string | null;
      ownerInstitutionId: string | null;
    },
    quantity: number,
  ): Promise<VoucherBatch> {
    return await this.voucherBatchRepository.save(
      this.voucherBatchRepository.create({
        ...ownership,
        quantity,
        unitPrice: '0',
        totalPrice: '0',
        status: VoucherBatchStatus.PAID,
        paidAt: new Date(),
      }),
    );
  }

  private async prepareVouchers(
    batchId: string,
    ownership: {
      ownerType: VoucherOwnerType;
      ownerUserId: string | null;
      ownerInstitutionId: string | null;
    },
    quantity: number,
    expiresAt: Date | null,
    manualCode?: string,
    patientName?: string,
    patientEmail?: string,
  ): Promise<Voucher[]> {
    const vouchers: Voucher[] = [];

    for (let i = 0; i < quantity; i++) {
      const code = manualCode
        ? this.codeGenerator.normalize(manualCode)
        : await this.codeGenerator.generateUniqueCode();

      vouchers.push(
        this.voucherRepository.create({
          ...ownership,
          code,
          batchId,
          status: VoucherStatus.AVAILABLE,
          assignedPatientName: patientName ?? null,
          assignedPatientEmail: patientEmail ?? null,
          expiresAt,
        }),
      );
    }

    return vouchers;
  }

  async findById(id: string, scope?: VoucherScope): Promise<Voucher> {
    const where = this.queryService.buildScopedWhere(scope);
    if (where === null) throw new NotFoundException('Voucher no encontrado');

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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al enviar el email';
      throw new BadRequestException(message);
    }

    await this.voucherRepository.save(voucher);
    return await this.notifierService.sendVoucherEmail(voucher, targetEmail);
  }

  async resendEmail(
    id: string,
    scope?: VoucherScope,
    customEmail?: string,
  ): Promise<boolean> {
    return this.sendEmail(id, scope, customEmail);
  }

  async revoke(id: string, scope?: VoucherScope): Promise<Voucher> {
    const voucher = await this.findById(id, scope);
    try {
      voucher.revoke();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al revocar el voucher';
      throw new BadRequestException(message);
    }
    return await this.voucherRepository.save(voucher);
  }

  async resolveAvailableVoucher(code: string): Promise<Voucher> {
    const voucher = await this.findByCode(code);
    this.assertVoucherAvailable(voucher);
    return voucher;
  }

  async redeemVoucher(
    manager: EntityManager,
    code: string,
    sessionId: string,
  ): Promise<{ voucher: Voucher; action: 'REDEEMED' | 'ALREADY_REDEEMED' }> {
    const normalizedCode = this.codeGenerator.normalize(code);
    const voucherRepository = manager.getRepository(Voucher);

    const voucher = await voucherRepository.findOne({
      where: { code: normalizedCode },
    });

    if (!voucher) {
      throw new NotFoundException('INVALID_CODE');
    }

    if (voucher.redeemedSessionId === sessionId) {
      return { voucher, action: 'ALREADY_REDEEMED' };
    }

    if (voucher.status === VoucherStatus.USED) {
      throw new ConflictException('ALREADY_USED');
    }

    try {
      voucher.redeem(sessionId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al redimir el voucher';
      throw new BadRequestException(message);
    }

    const savedVoucher = await voucherRepository.save(voucher);
    return { voucher: savedVoucher, action: 'REDEEMED' };
  }

  async attachVoucherToSession(
    code: string,
    sessionId: string,
    patientName?: string | null,
  ): Promise<Voucher> {
    const voucher = await this.resolveAvailableVoucher(code);

    try {
      voucher.redeem(sessionId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al adjuntar el voucher';
      throw new BadRequestException(message);
    }

    if (patientName && !voucher.assignedPatientName) {
      voucher.assignedPatientName = patientName;
    }
    return await this.voucherRepository.save(voucher);
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

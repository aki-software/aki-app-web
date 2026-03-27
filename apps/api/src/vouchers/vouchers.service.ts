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
import { UsersService } from '../users/users.service';

type VoucherScope = {
  role?: string;
  ownerUserId?: string;
  ownerInstitutionId?: string | null;
};

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(VoucherBatch)
    private readonly voucherBatchRepository: Repository<VoucherBatch>,
    private readonly usersService: UsersService,
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

  async findAll(scope?: VoucherScope): Promise<{ data: Voucher[]; count: number }> {
    const where = this.buildScopedWhere(scope);

    const [data, count] = await this.voucherRepository.findAndCount({
      where,
      relations: ['ownerUser', 'ownerInstitution', 'redeemedSession'],
      order: { createdAt: 'DESC' },
    });

    return { data, count };
  }

  async findByCode(code: string): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({
      where: { code: this.normalizeCode(code) },
      relations: ['ownerUser', 'ownerInstitution'],
    });

    if (!voucher) {
      throw new NotFoundException('Voucher no encontrado');
    }

    return voucher;
  }

  private assertVoucherAvailable(voucher: Voucher) {
    if (voucher.status !== VoucherStatus.AVAILABLE) {
      throw new BadRequestException('Voucher no disponible');
    }

    if (voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Voucher expirado');
    }
  }

  private async normalizeOwner(
    ownerType?: VoucherOwnerType,
    ownerUserId?: string | null,
    ownerInstitutionId?: string | null,
  ): Promise<{
    ownerType: VoucherOwnerType;
    ownerUserId: string | null;
    ownerInstitutionId: string | null;
  }> {
    if (!ownerType) {
      throw new BadRequestException('ownerType es obligatorio para vouchers');
    }

    if (ownerType === VoucherOwnerType.THERAPIST && !ownerUserId) {
      throw new BadRequestException(
        'ownerUserId es obligatorio para vouchers de terapeuta',
      );
    }

    if (ownerType === VoucherOwnerType.THERAPIST && ownerUserId) {
      const therapist = await this.usersService.ensureInstitutionOwner(
        ownerUserId,
      );
      return {
        ownerType: VoucherOwnerType.INSTITUTION,
        ownerUserId: therapist.id,
        ownerInstitutionId: therapist.institutionId,
      };
    }

    if (ownerType === VoucherOwnerType.INSTITUTION && !ownerInstitutionId) {
      throw new BadRequestException(
        'ownerInstitutionId es obligatorio para vouchers de institución',
      );
    }

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
      if (code.length < 8) {
        continue;
      }

      const existing = await this.voucherRepository.findOne({
        where: { code },
      });
      if (!existing) {
        return code;
      }
    }

    throw new BadRequestException(
      'No se pudo generar un código de voucher único',
    );
  }

  private buildScopedWhere(
    scope?: VoucherScope,
  ): FindOptionsWhere<Voucher> | undefined {
    const normalizedRole = scope?.role?.toUpperCase();

    if (normalizedRole === 'ADMIN') {
      return undefined;
    }

    if (scope?.ownerInstitutionId) {
      return { ownerInstitutionId: scope.ownerInstitutionId };
    }

    if (scope?.ownerUserId) {
      return { ownerUserId: scope.ownerUserId };
    }

    return { id: '__forbidden__' };
  }
}

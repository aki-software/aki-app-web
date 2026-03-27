import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherBatch } from './entities/voucher-batch.entity';
import {
  VoucherBatchStatus,
  VoucherOwnerType,
  VoucherStatus,
} from './entities/voucher.enums';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(VoucherBatch)
    private readonly voucherBatchRepository: Repository<VoucherBatch>,
    private readonly usersService: UsersService,
  ) {}

  async create(createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    const normalizedOwnership = await this.normalizeOwner(
      createVoucherDto.ownerType,
      createVoucherDto.ownerUserId,
      createVoucherDto.ownerInstitutionId,
    );

    const quantity = createVoucherDto.quantity ?? 1;
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

    const voucher = this.voucherRepository.create({
      code: this.normalizeCode(createVoucherDto.code ?? this.generateVoucherCode()),
      batchId: batch.id,
      ownerType: normalizedOwnership.ownerType,
      ownerUserId: normalizedOwnership.ownerUserId,
      ownerInstitutionId: normalizedOwnership.ownerInstitutionId,
      status: VoucherStatus.AVAILABLE,
      assignedPatientName: createVoucherDto.assignedPatientName ?? null,
      assignedPatientEmail: createVoucherDto.assignedPatientEmail ?? null,
      expiresAt: createVoucherDto.expiresAt
        ? new Date(createVoucherDto.expiresAt)
        : null,
    });

    return await this.voucherRepository.save(voucher);
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

  private generateVoucherCode(): string {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
  }
}

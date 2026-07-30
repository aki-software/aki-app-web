import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Institution } from './entities/institution.entity.js';
import type { CreateInstitutionDto } from './dto/create-institution.dto.js';
import type { UpdateInstitutionDto } from './dto/update-institution.dto.js';
import { UserInstitution } from '../users/entities/user-institution.entity.js';
import { Voucher } from '../vouchers/entities/voucher.entity.js';
import {
  VoucherStatus,
  VoucherOwnerType,
} from '../vouchers/entities/voucher.enums.js';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
    @InjectRepository(UserInstitution)
    private readonly userInstitutionRepository: Repository<UserInstitution>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
  ) {}

  async findAll(): Promise<Institution[]> {
    return await this.institutionRepository.find({
      relations: ['responsibleTherapist'],
      order: { name: 'ASC' },
    });
  }

  async findOneOrFail(id: string): Promise<Institution> {
    return await this.institutionRepository.findOneOrFail({
      where: { id },
      relations: ['responsibleTherapist'],
    });
  }

  async create(input: CreateInstitutionDto): Promise<Institution> {
    const institution = this.institutionRepository.create({
      name: input.name.trim(),
      billingEmail: input.billingEmail?.trim() || null,
      responsibleTherapistUserId: input.responsibleTherapistUserId ?? null,
      isActive: true,
    });

    return await this.institutionRepository.save(institution);
  }

  async assignResponsibleTherapist(
    institutionId: string,
    responsibleTherapistUserId: string,
  ): Promise<Institution> {
    await this.institutionRepository.update(institutionId, {
      responsibleTherapistUserId,
    });

    return await this.institutionRepository.findOneOrFail({
      where: { id: institutionId },
      relations: ['responsibleTherapist'],
    });
  }

  async update(id: string, data: UpdateInstitutionDto): Promise<Institution> {
    await this.institutionRepository.update(id, {
      name: data.name?.trim(),
      billingEmail: data.billingEmail?.trim() || null,
    });

    return await this.institutionRepository.findOneOrFail({
      where: { id },
      relations: ['responsibleTherapist'],
    });
  }

  async updateLogo(id: string, logoUrl: string): Promise<Institution> {
    await this.institutionRepository.update(id, { logoUrl });
    return await this.institutionRepository.findOneOrFail({
      where: { id },
    });
  }

  async updateStatus(id: string, isActive: boolean): Promise<Institution> {
    await this.institutionRepository.update(id, { isActive });

    return await this.institutionRepository.findOneOrFail({
      where: { id },
      relations: ['responsibleTherapist'],
    });
  }

  async softRemove(id: string): Promise<void> {
    const institution = await this.institutionRepository.findOneOrFail({
      where: { id },
    });
    await this.institutionRepository.softRemove(institution);
  }

  async removeTherapist(
    institutionId: string,
    therapistUserId: string,
  ): Promise<void> {
    const userInstitution = await this.userInstitutionRepository.findOne({
      where: { institutionId, userId: therapistUserId },
    });

    if (userInstitution) {
      await this.userInstitutionRepository.remove(userInstitution);

      // Recycle unspent vouchers assigned to this therapist back to the institution pool
      const vouchers = await this.voucherRepository.find({
        where: {
          ownerInstitutionId: institutionId,
          ownerUserId: therapistUserId,
          status: In([VoucherStatus.AVAILABLE, VoucherStatus.SENT]),
        },
      });
      if (vouchers.length > 0) {
        for (const voucher of vouchers) {
          voucher.ownerUserId = null;
          voucher.ownerType = VoucherOwnerType.INSTITUTION;
        }
        await this.voucherRepository.save(vouchers);
      }
    }
  }
}

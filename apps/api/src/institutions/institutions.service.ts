import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { UsersService } from '../users/users.service.js';
import { Institution } from './entities/institution.entity.js';
import type { CreateInstitutionDto } from './dto/create-institution.dto.js';
import type { UpdateInstitutionDto } from './dto/update-institution.dto.js';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
    private readonly usersService: UsersService,
  ) {}

  @OnEvent('user.registered', { async: true })
  async handleUserRegistered(user: any) {
    if (!user.institutionId) {
      const institution = this.institutionRepository.create({
        name: `Consultorio ${user.name}`,
        billingEmail: user.email?.trim() || null,
        responsibleTherapistUserId: user.id,
        isActive: true,
      });
      const savedInstitution =
        await this.institutionRepository.save(institution);

      await this.usersService.register({
        ...user,
        institutionId: savedInstitution.id,
      });
    }
  }

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
      legalName: input.legalName?.trim() || null,
      taxId: input.taxId?.trim() || null,
      taxCondition: input.taxCondition?.trim() || null,
      billingAddress: input.billingAddress?.trim() || null,
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
    const updatePayload: Record<string, any> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.billingEmail !== undefined) {
      updatePayload.billingEmail = data.billingEmail.trim() || null;
    }
    if (data.legalName !== undefined) {
      updatePayload.legalName = data.legalName.trim() || null;
    }
    if (data.taxId !== undefined) {
      updatePayload.taxId = data.taxId.trim() || null;
    }
    if (data.taxCondition !== undefined) {
      updatePayload.taxCondition = data.taxCondition.trim() || null;
    }
    if (data.billingAddress !== undefined) {
      updatePayload.billingAddress = data.billingAddress.trim() || null;
    }
    if (data.billingCity !== undefined) {
      updatePayload.billingCity = data.billingCity.trim() || null;
    }
    if (data.billingProvince !== undefined) {
      updatePayload.billingProvince = data.billingProvince.trim() || null;
    }
    if (data.billingPhone !== undefined) {
      updatePayload.billingPhone = data.billingPhone.trim() || null;
    }

    if (Object.keys(updatePayload).length > 0) {
      await this.institutionRepository.update(id, updatePayload);
    }

    return await this.institutionRepository.findOneOrFail({
      where: { id },
      relations: ['responsibleTherapist'],
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

  async updateBillingProfile(
    id: string,
    data: import('./dto/update-billing-profile.dto.js').UpdateBillingProfileDto,
  ): Promise<Institution> {
    const institution = await this.findOneOrFail(id);
    institution.updateBillingProfile(
      data.legalName.trim(),
      data.taxId.trim(),
      data.taxCondition.trim(),
      data.billingAddress.trim(),
      data.billingCity.trim(),
      data.billingProvince.trim(),
      data.billingPhone.trim(),
    );
    return await this.institutionRepository.save(institution);
  }
}

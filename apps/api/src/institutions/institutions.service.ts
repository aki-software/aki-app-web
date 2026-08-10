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
}

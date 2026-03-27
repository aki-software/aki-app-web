import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institution } from './entities/institution.entity';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
  ) {}

  async findAll(): Promise<Institution[]> {
    return await this.institutionRepository.find({
      relations: ['responsibleTherapist'],
      order: { name: 'ASC' },
    });
  }

  async create(input: {
    name: string;
    billingEmail?: string | null;
    responsibleTherapistUserId?: string | null;
  }): Promise<Institution> {
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
}

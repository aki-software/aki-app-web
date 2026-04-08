import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Institution } from './entities/institution.entity';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
    private readonly dataSource: DataSource,
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

  async getStats(institutionId: string) {
    const totalSessionsRes = await this.dataSource.query(
      `SELECT count(*) as count FROM sessions WHERE institution_id = $1`,
      [institutionId],
    );
    const vouchersRes = await this.dataSource.query(
      `SELECT status, count(*) as count FROM vouchers WHERE owner_institution_id = $1 GROUP BY status`,
      [institutionId],
    );

    const stats = {
      totalSessions: parseInt(totalSessionsRes[0]?.count || '0', 10),
      availableVouchers: 0,
      redeemedVouchers: 0,
    };

    for (const row of vouchersRes) {
      if (row.status === 'AVAILABLE') {
        stats.availableVouchers = parseInt(row.count, 10);
      } else if (row.status === 'USED') {
        stats.redeemedVouchers = parseInt(row.count, 10);
      }
    }

    return stats;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { CategoriesService } from '../categories/categories.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private categoriesService: CategoriesService,
    private mailService: MailService,
  ) {}

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const session = this.sessionRepository.create(createSessionDto);
    return await this.sessionRepository.save(session);
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Session[]; count: number }> {
    const [data, count] = await this.sessionRepository.findAndCount({
      relations: ['results'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, count };
  }

  async findOne(id: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ['results', 'swipes'],
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async sendReport(
    sessionId: string,
    targetEmail: string,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.findOne(sessionId);
    const categories = await this.categoriesService.findAll();

    const topResults = (session.results || [])
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);

    const formattedResults = topResults.map((res) => {
      const catInfo = categories.find((c) => c.categoryId === res.categoryId);
      return {
        title: catInfo ? catInfo.title : res.categoryId,
        percentage: res.percentage,
        description: catInfo
          ? catInfo.description
          : 'Información no disponible.',
      };
    });

    const sent = await this.mailService.sendVocationalReport(
      targetEmail,
      session.patientName,
      formattedResults,
    );

    if (!sent) {
      return {
        success: false,
        message: 'Hubo un error despachando el correo electrónico.',
      };
    }

    return { success: true, message: `Email despachado hacia ${targetEmail}` };
  }
}

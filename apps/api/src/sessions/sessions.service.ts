import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private categoriesService: CategoriesService
  ) {}

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const session = this.sessionRepository.create(createSessionDto);
    return await this.sessionRepository.save(session);
  }

  async findAll(page: number = 1, limit: number = 20): Promise<{ data: Session[]; count: number }> {
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

  async sendReport(sessionId: string, targetEmail: string): Promise<{ success: boolean; message: string }> {
    const session = await this.findOne(sessionId);
    const categories = await this.categoriesService.findAll();

    // Enviar el Top 3 de los resultados cruzando datos de BDD con Teoría
    const topResults = (session.results || []).sort((a, b) => b.percentage - a.percentage).slice(0, 3);

    let htmlContent = `<h1>Reporte Vocacional A.kit - Paciente: ${session.patientName}</h1>\n`;
    htmlContent += `<p>Te compartimos los resultados interpretados de tu prueba:</p>\n`;

    for (const res of topResults) {
      const catInfo = categories.find(c => c.categoryId === res.categoryId);
      if (catInfo) {
        htmlContent += `<h3>Perfil: ${catInfo.title} (${res.percentage}%)</h3>\n`;
        htmlContent += `<p>${catInfo.description}</p>\n<hr/>\n`;
      }
    }

    // ACA IRIA NODEMAILER CON SES o RESEND. Por ahora mockeamos console.
    console.log(`\n\n=== ✉️  MOCK EMAIL DISPATCHER ===`);
    console.log(`To: ${targetEmail}`);
    console.log(`Subject: Resultados del Test Vocacional de ${session.patientName}`);
    console.log(`Body: \n${htmlContent}`);
    console.log(`=================================\n\n`);

    return { success: true, message: `Email mockeado y despachado hacia ${targetEmail}` };
  }
}

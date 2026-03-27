import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { CategoriesService } from '../categories/categories.service';
import { MailService, CategoryResult } from '../mail/mail.service';

import { PdfService } from '../common/services/pdf.service';
import { StorageService } from '../common/services/storage.service';

type SessionScope = {
  role?: string;
  therapistUserId?: string;
  patientId?: string;
  institutionId?: string | null;
};

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private categoriesService: CategoriesService,
    private mailService: MailService,
    private pdfService: PdfService,
    private storageService: StorageService,
  ) {}

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const session = this.sessionRepository.create(createSessionDto);
    return await this.sessionRepository.save(session);
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    scope?: SessionScope,
  ): Promise<{ data: Session[]; count: number }> {
    const where = this.buildScopedWhere(scope);

    const [data, count] = await this.sessionRepository.findAndCount({
      relations: ['results', 'institution', 'therapist', 'voucher'],
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, count };
  }

  async findOne(id: string, scope?: SessionScope): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: this.buildScopedWhere(scope, id),
      relations: ['results', 'swipes', 'institution', 'therapist', 'voucher'],
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

    const formattedResults: CategoryResult[] = topResults.map((res) => {
      const catInfo = categories.find((c) => c.categoryId === res.categoryId);
      const description = catInfo
        ? catInfo.description
        : 'Información no disponible.';

      const parsedBlocks = description
        .split('\n\n')
        .map((b) => b.trim())
        .filter(Boolean)
        .map((b) => {
          let subtitle = '';
          let content = b;
          const colonIndex = b.indexOf(':');
          if (colonIndex > 0 && colonIndex < 80) {
            subtitle = b.slice(0, colonIndex).trim();
            content = b.slice(colonIndex + 1).trim();
          }
          return { subtitle, content };
        });

      return {
        title: catInfo ? catInfo.title : res.categoryId,
        percentage: res.percentage,
        description,
        parsedBlocks,
        suggestedCareers: res.suggestedCareers,
        materialSnippet: res.materialSnippet,
      };
    });

    const htmlContent = this.mailService.renderReportTemplate(
      session.patientName,
      formattedResults,
      session.hollandCode ?? undefined,
    );

    let pdfBuffer: Buffer | undefined;
    try {
      pdfBuffer = await this.pdfService.generateFromHtml(htmlContent);

      const fileName = `report_${sessionId}_${Date.now()}.pdf`;
      const reportUrl = await this.storageService.uploadFile(
        pdfBuffer,
        fileName,
      );

      // Persistir la URL en la sesión solo si se generó (S3 configurado)
      if (reportUrl) {
        session.reportUrl = reportUrl;
        await this.sessionRepository.save(session);
      }
    } catch (err) {
      console.error(
        '⚠️ Falló la generación o subida del PDF, se enviará solo HTML:',
        err,
      );
    }

    const sent = await this.mailService.sendVocationalReport(
      targetEmail,
      session.patientName,
      formattedResults,
      session.hollandCode ?? undefined,
      pdfBuffer,
    );

    if (!sent) {
      return {
        success: false,
        message: 'Hubo un error despachando el correo electrónico.',
      };
    }

    return { success: true, message: `Email despachado hacia ${targetEmail}` };
  }

  private buildScopedWhere(
    scope?: SessionScope,
    sessionId?: string,
  ): FindOptionsWhere<Session> | undefined {
    const normalizedRole = scope?.role?.toUpperCase();

    if (normalizedRole === 'ADMIN') {
      const adminScope: FindOptionsWhere<Session> = {
        voucherId: IsNull(),
      };
      return sessionId ? { ...adminScope, id: sessionId } : adminScope;
    }

    const scopedWhere =
      normalizedRole === 'PATIENT' && scope?.patientId
        ? { patientId: scope.patientId }
        : scope?.therapistUserId
          ? { therapistUserId: scope.therapistUserId }
          : scope?.institutionId
            ? { institutionId: scope.institutionId }
            : { id: '__forbidden__' };

    return sessionId ? { ...scopedWhere, id: sessionId } : scopedWhere;
  }
}

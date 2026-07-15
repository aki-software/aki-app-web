import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service.js';
import type {
  ReportData,
  ReportSummary,
  ReportTripletInsight,
} from '../../common/types/report.types.js';

@Injectable()
export class ReportDeliveryService {
  private readonly logger = new Logger(ReportDeliveryService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  private renderReportText(
    patientName: string,
    hollandCode?: string,
    reportUrl?: string,
    summary?: ReportSummary,
    tripletInsight?: ReportTripletInsight,
  ): string {
    const lines: string[] = [];
    lines.push('INFORME DE RESULTADOS VOCACIONALES');
    lines.push('');
    lines.push(
      `Hola ${patientName}, aqui tienes los detalles de tu exploracion vocacional.`,
    );

    if (summary) {
      lines.push('');
      lines.push('RESUMEN EJECUTIVO');
      lines.push('');
      lines.push(
        `Afinidad principal: ${summary.primaryTitle} (${summary.primaryPercentage}%)`,
      );
      lines.push(`Fortaleza destacada: ${summary.profileStrength}`);
      lines.push(`Recomendacion: ${summary.recommendation}`);
    }

    if (summary?.rankedAreas?.length) {
      lines.push('');
      lines.push('Ranking de afinidad (Top 3):');
      summary.rankedAreas.forEach((area, idx) => {
        lines.push(`${idx + 1}. ${area.title} (${area.percentage}%)`);
      });
      lines.push('');
    }

    if (tripletInsight) {
      lines.push(`Combinacion destacada: ${tripletInsight.title}`);
      if (tripletInsight.tendencies?.length) {
        lines.push('Tendencias observadas:');
        tripletInsight.tendencies.forEach((item) => lines.push(`- ${item}`));
      }
      lines.push('');
    }

    if (reportUrl) {
      lines.push(`Descargar informe completo en PDF: ${reportUrl}`);
      lines.push('');
    }

    const supportEmail = this.configService.get<string>(
      'SUPPORT_EMAIL',
      'soporte@orienta.ki',
    );
    const brandDomain = this.configService.get<string>(
      'BRAND_DOMAIN',
      'orienta.ki',
    );
    lines.push(`Soporte tecnico: ${supportEmail}`);
    lines.push(`Sitio: ${brandDomain}`);
    return lines.join('\n');
  }

  async deliverReport(
    targetEmail: string,
    sessionId: string,
    voucherIdForLogging: string | undefined,
    reportData: ReportData,
    pdfBuffer?: Buffer,
  ): Promise<{ success: boolean; message: string }> {
    const rawName = reportData.patientName.replace(/\s*\(.*?\)\s*/g, '').trim();
    const cleanPatientName = rawName.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
    );

    const templatePayload = {
      patientName: cleanPatientName,
      patientEmail: targetEmail || null,
      hollandCode: reportData.hollandCode || null,
      reportUrl: null,
      summary: reportData.summary || null,
    };

    const textContent = this.renderReportText(
      cleanPatientName,
      reportData.hollandCode,
      undefined,
      reportData.summary,
      reportData.tripletInsight ?? undefined,
    );

    const attachments = pdfBuffer
      ? [
          {
            filename: `Informe_Vocacional_${cleanPatientName.replace(/\s+/g, '_')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : undefined;

    const meta = {
      to: targetEmail,
      subject: `📊 Tu Informe Vocacional`,
      text: textContent,
      attachments,
    };

    let sent = false;
    try {
      sent = await this.mailService.send(
        'report-email.pug',
        templatePayload,
        meta,
      );
    } catch {
      sent = false;
    }

    if (!sent) {
      this.logger.error(
        `Email dispatch failed for sessionId=${sessionId} targetEmail=${targetEmail}`,
      );
      return {
        success: false,
        message: 'Hubo un error despachando el correo electrónico.',
      };
    }

    this.logger.log(
      `Email dispatched for sessionId=${sessionId} voucherId=${voucherIdForLogging ?? 'none'} targetEmail=${targetEmail} mode=${pdfBuffer ? 'pdf' : 'html_fallback'}`,
    );

    return {
      success: true,
      message: `Email despachado hacia ${targetEmail}`,
    };
  }
}

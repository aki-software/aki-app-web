import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';

@Injectable()
export class SessionReportService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
  ) {}

  async generatePdf(sessionId: string): Promise<Buffer> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['metrics', 'results', 'swipes', 'voucher', 'therapist', 'institution'],
    });

    if (!session) throw new NotFoundException('Session not found');

    const metrics = session.metrics;

    // Generar PDF usando html2pdf (alternativa a pdfkit)
    // Por ahora retornamos un buffer vacío - se implementará con html2pdf
    const pdfContent = this.generatePdfContent(session, metrics);
    
    return Buffer.from(pdfContent);
  }

  private generatePdfContent(session: any, metrics: any): string {
    const formatDuration = (ms: number) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    };

    const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

    const resultsTable = session.results
      .map(
        (r: any) =>
          `<tr><td>${r.categoryId}</td><td>${r.percentage}%</td><td><div style="width: ${r.percentage * 2}px; height: 20px; background: #2563eb;"></div></td></tr>`,
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { text-align: center; color: #1f2937; }
    .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
    .section { margin: 20px 0; }
    .section h2 { font-size: 16px; color: #1f2937; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
    .info { margin: 10px 0; }
    .info strong { display: inline-block; width: 200px; }
    .holland-code { text-align: center; font-size: 48px; font-weight: bold; color: #2563eb; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f3f4f6; font-weight: bold; }
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .metric-box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
    .metric-label { font-size: 12px; color: #666; }
    .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; margin-top: 5px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; }
  </style>
</head>
<body>
  <h1>Reporte de Sesión Vocacional</h1>
  <p class="subtitle">A.Kit - Análisis Vocacional</p>

  <div class="section">
    <h2>Información del Paciente</h2>
    <div class="info"><strong>Nombre:</strong> ${session.patientName}</div>
    <div class="info"><strong>Fecha:</strong> ${new Date(session.sessionDate).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}</div>
    <div class="info"><strong>Duración:</strong> ${formatDuration(session.totalTimeMs)}</div>
    ${session.therapist ? `<div class="info"><strong>Terapeuta:</strong> ${session.therapist.name}</div>` : ''}
    ${session.institution ? `<div class="info"><strong>Institución:</strong> ${session.institution.name}</div>` : ''}
  </div>

  <div class="section">
    <h2>Código Holland (RIASEC)</h2>
    <div class="holland-code">${session.hollandCode || 'N/A'}</div>
  </div>

  <div class="section">
    <h2>Resultados por Categoría</h2>
    <table>
      <thead>
        <tr>
          <th>Categoría</th>
          <th>Porcentaje</th>
          <th>Barra</th>
        </tr>
      </thead>
      <tbody>
        ${resultsTable}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Métricas de Desempeño</h2>
    <div class="metrics-grid">
      <div class="metric-box">
        <div class="metric-label">Total de Swipes</div>
        <div class="metric-value">${metrics.totalSwipes}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Tarjetas Únicas</div>
        <div class="metric-value">${metrics.uniqueCards}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Matches Revertidos</div>
        <div class="metric-value">${metrics.revertedMatches}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Velocidad Promedio</div>
        <div class="metric-value">${formatSeconds(metrics.avgTimeBetweenSwipesMs)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Tiempo Mínimo</div>
        <div class="metric-value">${formatSeconds(metrics.minTimeBetweenSwipesMs)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Tiempo Máximo</div>
        <div class="metric-value">${formatSeconds(metrics.maxTimeBetweenSwipesMs)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Confiabilidad</div>
        <div class="metric-value">${metrics.reliabilityLevel}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Score</div>
        <div class="metric-value">${metrics.reliabilityScore}%</div>
      </div>
    </div>
  </div>

  ${
    session.voucher
      ? `
  <div class="section">
    <h2>Información de Voucher</h2>
    <div class="info"><strong>Código:</strong> ${session.voucher.code}</div>
    <div class="info"><strong>Canjeado:</strong> ${new Date(session.reportUnlockedAt).toLocaleDateString('es-ES')}</div>
  </div>
  `
      : ''
  }

  <div class="footer">
    <p>Reporte generado automáticamente por A.Kit</p>
    <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
  </div>
</body>
</html>
    `;

    return html;
  }
}

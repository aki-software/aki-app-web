import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as pug from 'pug';
import { colors } from '@akit/design-tokens';
import { VocationalCategory } from '../../categories/entities/vocational-category.entity.js';
import { TresAreasService } from '../../tres-areas/tres-areas.service.js';
import {
  CategoryResult,
  ReportData,
  ReportSummary,
  ReportTripletInsight,
} from '../../common/types/report.types.js';
import { Session } from '../entities/session.entity.js';

type CategoryEntityLike = {
  categoryId: string;
  title: string;
  description: string;
};

const DESCRIPTION_LABELS = [
  'descripcion breve',
  'algunas ocupaciones que se vinculan al area',
  'algunas ocupaciones que se vincular al area',
  'tambien puede incluir profesiones mas tecnicas o formales como',
  'competencias importantes para desempenarse en el area',
  'competencias importantes para desempenarse en el area',
  'competencias importantes',
] as const;

const AREA_BY_CATEGORY_ID: Record<string, string> = {
  ART: 'Artistico',
  HUM: 'Humanitario',
  SERV: 'Servicios',
  PROT: 'Proteccion',
  PHYS: 'Desempeno fisico',
  IND: 'Industrial',
  MECH: 'Mecanica',
  NAT: 'Plantas y animales',
  LEAD: 'Liderazgo',
  SCI: 'Cientifico',
  SAL: 'Ventas',
  BUS: 'Negocio',
};

@Injectable()
export class ReportService {
  private readonly brandDomain = 'akituespacio.com.ar';
  private readonly supportEmail = 'akituvocacion@gmail.com';
  private readonly logoAssetPath = path.join(
    process.cwd(),
    '..',
    'web',
    'src',
    'assets',
    'logo.png',
  );

  constructor(
    @InjectRepository(VocationalCategory)
    private readonly categoriesRepository: Repository<VocationalCategory>,
    private readonly tresAreasService: TresAreasService,
  ) {}

  async buildReportData(session: Session, email?: string): Promise<ReportData> {
    const categories = await this.categoriesRepository.find();
    const categoriesById = new Map(
      categories.map((category) => [
        category.categoryId.trim().toUpperCase(),
        category,
      ]),
    );

    const topResults = (session.results || [])
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);

    const strengths: string[] = [];

    const formattedResults: CategoryResult[] = (session.results || [])
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3)
      .map((res) => {
        const normalizedCategoryId = this.normalizeCategoryId(res.categoryId);
        const catInfo = categoriesById.get(normalizedCategoryId);
        const description = catInfo
          ? catInfo.description
          : res.materialSnippet || 'Información no disponible.';

        const parsedBlocks = this.parseCategoryDescription(description);

        parsedBlocks.forEach((block) => {
          if (
            block.subtitle?.toLowerCase().includes('competencias') &&
            block.content
          ) {
            const skills = block.content
              .split(/[.;•-]/)
              .map((s) => s.trim())
              .filter((s) => s.length > 5 && s.length < 50);
            strengths.push(...skills);
          }
        });

        const uniqueCareers = Array.from(
          new Set(
            (res.suggestedCareers ?? [])
              .map((career) => String(career).trim())
              .filter(Boolean),
          ),
        );

        return {
          title: catInfo ? catInfo.title : normalizedCategoryId,
          percentage: this.normalizePercentage(res.percentage),
          description,
          parsedBlocks,
          suggestedCareers: uniqueCareers,
          materialSnippet: res.materialSnippet,
        };
      });

    const summary = this.buildReportSummary(formattedResults);
    const tripletInsight = await this.buildTripletInsight(
      topResults,
      categoriesById,
    );
    const hollandPercentages = this.calculateHollandPercentages(
      session.results || [],
    );

    const cleanPatientName = session.patientName.replace(/\s*\(.*?\)\s*/g, '').trim();

    return {
      patientName: cleanPatientName,
      patientEmail: email,
      hollandCode: session.hollandCode ?? undefined,
      hollandPercentages,
      topResults: formattedResults,
      summary,
      tripletInsight,
      strengths: Array.from(new Set(strengths)).slice(0, 6),
    };
  }

  renderReportPdfHtml(reportData: ReportData): string {
    const templatePath = path.join(
      process.cwd(),
      'src',
      'mail',
      'templates',
      'report-pdf.pug',
    );

    return pug.renderFile(templatePath, {
      patientName: reportData.patientName,
      patientEmail: reportData.patientEmail || null,
      topResults: reportData.topResults,
      hollandCode: reportData.hollandCode || null,
      summary: reportData.summary || null,
      tripletInsight: reportData.tripletInsight || null,
      hollandPercentages: reportData.hollandPercentages || null,
      strengths: reportData.strengths || [],
      colors,
      logoDataUri: this.getLogoDataUri(),
      brandDomain: this.brandDomain,
      supportEmail: this.supportEmail,
    });
  }

  private getLogoDataUri(): string | null {
    try {
      if (fs.existsSync(this.logoAssetPath)) {
        const buffer = fs.readFileSync(this.logoAssetPath);
        const ext = path.extname(this.logoAssetPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
        return `data:${mime};base64,${buffer.toString('base64')}`;
      }
      return null;
    } catch {
      return null;
    }
  }

  private calculateHollandPercentages(results: any[]): Record<string, number> {
    const scores: Record<string, number[]> = {
      R: [], // MECH, PHYS, IND, NAT
      I: [], // SCI
      A: [], // ART, HUM
      S: [], // SERV, PROT
      E: [], // LEAD, SAL
      C: [], // BUS
    };

    const mapping: Record<string, string> = {
      MECH: 'R',
      PHYS: 'R',
      IND: 'R',
      NAT: 'R',
      SCI: 'I',
      ART: 'A',
      HUM: 'A',
      SERV: 'S',
      PROT: 'S',
      LEAD: 'E',
      SAL: 'E',
      BUS: 'C',
    };

    results.forEach((res) => {
      const type = mapping[res.categoryId.toUpperCase()];
      if (type) {
        scores[type].push(res.percentage);
      }
    });

    const finalPercentages: Record<string, number> = {};
    Object.keys(scores).forEach((type) => {
      const typeScores = scores[type];
      if (typeScores.length > 0) {
        const avg = typeScores.reduce((a, b) => a + b, 0) / typeScores.length;
        finalPercentages[type] = Math.round(avg);
      } else {
        finalPercentages[type] = 0;
      }
    });

    return finalPercentages;
  }

  private normalizeCategoryId(value: string): string {
    return value?.trim().toUpperCase() ?? '';
  }

  private normalizePercentage(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private parseCategoryDescription(
    description: string,
  ): Array<{ subtitle?: string; content: string }> {
    const normalized = this.normalizeDescription(description);
    if (!normalized) {
      return [{ content: 'Informacion no disponible.' }];
    }

    const markerRegex = /([A-Za-zÀ-ÿ\s]+?):\s*/g;
    const markers: Array<{ start: number; end: number; label: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = markerRegex.exec(normalized)) !== null) {
      const rawLabel = match[1]?.trim();
      if (!rawLabel) {
        continue;
      }

      const normalizedLabel = this.normalizeText(rawLabel);
      const isKnown = DESCRIPTION_LABELS.some(
        (known) => normalizedLabel === this.normalizeText(known),
      );

      if (isKnown) {
        markers.push({
          start: match.index,
          end: markerRegex.lastIndex,
          label: this.toTitleCaseLabel(rawLabel),
        });
      }
    }

    if (markers.length === 0) {
      return normalized
        .split('\n\n')
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((chunk) => ({ content: chunk }));
    }

    const blocks: Array<{ subtitle?: string; content: string }> = [];
    for (let index = 0; index < markers.length; index++) {
      const current = markers[index];
      const next = markers[index + 1];
      const segment = normalized
        .slice(current.end, next ? next.start : normalized.length)
        .replace(/\s+/g, ' ')
        .trim();

      if (!segment) {
        continue;
      }

      blocks.push({
        subtitle: current.label,
        content: segment,
      });
    }

    return blocks.length > 0 ? blocks : [{ content: normalized }];
  }

  private normalizeDescription(description: string): string {
    return description
      .replace(/\r/g, '\n')
      .replace(/\u00A0/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toTitleCaseLabel(label: string): string {
    const normalized = label.replace(/\s+/g, ' ').trim().toLowerCase();
    const fixed = normalized
      .replace(/^descripcion breve$/, 'Descripcion breve')
      .replace(
        /^algunas ocupaciones que se vincular al area$/,
        'Algunas ocupaciones que se vinculan al area',
      )
      .replace(
        /^algunas ocupaciones que se vinculan al area$/,
        'Algunas ocupaciones que se vinculan al area',
      )
      .replace(
        /^tambien puede incluir profesiones mas tecnicas o formales como$/,
        'Tambien puede incluir profesiones tecnicas o formales',
      )
      .replace(
        /^competencias importantes para desempenarse en el area$/,
        'Competencias importantes para desempenarse en el area',
      )
      .replace(/^competencias importantes$/, 'Competencias importantes');

    return fixed.charAt(0).toUpperCase() + fixed.slice(1);
  }

  private async buildTripletInsight(
    topResults: Array<{ categoryId: string }>,
    categoriesById: Map<string, CategoryEntityLike>,
  ): Promise<ReportTripletInsight | null> {
    if (topResults.length < 3) {
      return null;
    }

    const areaNames = topResults
      .slice(0, 3)
      .map((result) => {
        const normalizedId = this.normalizeCategoryId(result.categoryId);
        return (
          AREA_BY_CATEGORY_ID[normalizedId] ??
          categoriesById.get(normalizedId)?.title ??
          normalizedId
        );
      })
      .filter(Boolean);

    if (areaNames.length < 3) {
      return null;
    }

    const match = await this.tresAreasService.findByCategories(areaNames);
    if (!match) {
      return null;
    }

    const splitList = (value: string): string[] =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    return {
      title: match.title,
      narrative: match.narrative,
      tendencies: match.tendencies,
      possibleJobs: splitList(match.possibleJobs),
      relatedProfessions: splitList(match.relatedProfessions),
    };
  }

  private buildReportSummary(
    formattedResults: CategoryResult[],
  ): ReportSummary {
    const primary = formattedResults[0];
    const rankedAreas = formattedResults.map((result) => ({
      title: result.title,
      percentage: result.percentage,
    }));

    if (!primary) {
      return {
        primaryTitle: 'Perfil en evaluacion',
        primaryPercentage: 0,
        profileStrength:
          'Aun no contamos con resultados suficientes para definir una tendencia principal.',
        recommendation:
          'Te recomendamos completar la evaluacion y conversar tus resultados con un orientador.',
        rankedAreas: [],
      };
    }

    const profileStrength =
      primary.percentage >= 75
        ? `Mostras una inclinacion muy marcada hacia ${primary.title}, con motivacion sostenida y alta consistencia.`
        : primary.percentage >= 55
          ? `Presentas una afinidad clara hacia ${primary.title}, con una base solida para seguir explorando esta area.`
          : `Tu perfil es versatil y muestra interes distribuido, con ${primary.title} como punto de partida inicial.`;

    const recommendation =
      rankedAreas.length >= 2
        ? `Priorizá experiencias concretas en ${rankedAreas[0].title} y contrastalas con ${rankedAreas[1].title} para validar ajuste e interes real.`
        : `Avanzá con actividades de exploracion guiada en ${rankedAreas[0].title} para transformar afinidad en criterio vocacional.`;

    return {
      primaryTitle: primary.title,
      primaryPercentage: primary.percentage,
      profileStrength,
      recommendation,
      rankedAreas,
    };
  }
}

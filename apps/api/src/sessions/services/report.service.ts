import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VocationalCategory } from '../../categories/entities/vocational-category.entity.js';
import { TresAreasService } from '../../tres-areas/tres-areas.service.js';
import {
  CategoryResult,
  ReportData,
  ReportSummary,
  ReportTripletInsight,
} from '../../common/types/report.types.js';
import { Session } from '../entities/session.entity.js';
import { CategoryParserService } from './category-parser.service.js';
import { HollandCalculatorService } from './holland-calculator.service.js';
import { ReportPdfRendererService } from './report-pdf-renderer.service.js';

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
  constructor(
    @InjectRepository(VocationalCategory)
    private readonly categoriesRepository: Repository<VocationalCategory>,
    private readonly tresAreasService: TresAreasService,
    private readonly categoryParser: CategoryParserService,
    private readonly hollandCalculator: HollandCalculatorService,
    private readonly pdfRenderer: ReportPdfRendererService,
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
        const normalizedCategoryId = this.categoryParser.normalizeCategoryId(res.categoryId);
        const catInfo = categoriesById.get(normalizedCategoryId);
        const description = catInfo
          ? catInfo.description
          : res.materialSnippet || 'Información no disponible.';

        const parsedBlocks = this.categoryParser.parseCategoryDescription(description);

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
          percentage: this.categoryParser.normalizePercentage(res.percentage),
          description,
          parsedBlocks,
          suggestedCareers: uniqueCareers,
          materialSnippet: res.materialSnippet,
        };
      });

    const summary = this.buildReportSummary(formattedResults);
    const tripletInsight = await this.buildTripletInsight(topResults, categoriesById);
    const hollandPercentages = this.hollandCalculator.calculatePercentages(session.results || []);

    const cleanPatientName = session.patientName
      .replace(/\s*\(.*?\)\s*/g, '')
      .trim();

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
    return this.pdfRenderer.renderHtml(reportData);
  }

  private async buildTripletInsight(
    topResults: Array<{ categoryId: string }>,
    categoriesById: Map<string, { categoryId: string; title: string; description: string }>,
  ): Promise<ReportTripletInsight | null> {
    if (topResults.length < 3) {
      return null;
    }

    const areaNames = topResults
      .slice(0, 3)
      .map((result) => {
        const normalizedId = this.categoryParser.normalizeCategoryId(result.categoryId);
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

  private buildReportSummary(formattedResults: CategoryResult[]): ReportSummary {
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

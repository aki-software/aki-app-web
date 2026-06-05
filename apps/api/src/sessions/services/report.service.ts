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
import {
  normalizeCategoryId,
  normalizePercentage,
  parseCategoryDescription,
} from '../utils/category-parser.util.js';
import { calculateHollandPercentages } from '../utils/holland-calculator.util.js';

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

const TOP_RESULTS_COUNT = 3;
const HIGH_AFFINITY_THRESHOLD = 75;
const MODERATE_AFFINITY_THRESHOLD = 55;
const MIN_SKILL_LENGTH = 5;
const MAX_SKILL_LENGTH = 50;

@Injectable()
export class ReportService {
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

    // Los resultados vienen en orden de inserción (que respeta el orden del motor
    // psicométrico: percentage DESC → weightedScore DESC → categoryId ASC).
    // Ordenar explícitamente para garantizar consistencia en caso de variaciones de la DB.
    const sessionResults = (session.results || []).sort(
      (a, b) =>
        b.percentage - a.percentage ||
        (b.weightedScore ?? 0) - (a.weightedScore ?? 0) ||
        a.categoryId.localeCompare(b.categoryId),
    );
    const topResults = sessionResults.slice(0, TOP_RESULTS_COUNT);

    const strengths: string[] = [];

    const formattedResults: CategoryResult[] = topResults.map((res) => {
      const normalizedCategoryId = normalizeCategoryId(res.categoryId);
      const catInfo = categoriesById.get(normalizedCategoryId);
      const description = catInfo
        ? catInfo.description
        : res.materialSnippet || 'Información no disponible.';

      const parsedBlocks = parseCategoryDescription(description);

      const blockSkills = parsedBlocks
        .filter(
          (block) =>
            block.subtitle?.toLowerCase().includes('competencias') &&
            block.content,
        )
        .flatMap((block) => block.content.split(/[.;•-]/))
        .map((s) => s.trim())
        .filter(
          (s) => s.length > MIN_SKILL_LENGTH && s.length < MAX_SKILL_LENGTH,
        );

      strengths.push(...blockSkills);

      const uniqueCareers = Array.from(
        new Set(
          (res.suggestedCareers ?? [])
            .map((career) => String(career).trim())
            .filter(Boolean),
        ),
      );

      return {
        title: catInfo ? catInfo.title : normalizedCategoryId,
        percentage: normalizePercentage(res.percentage),
        timeSpentMs: res.timeSpentMs,
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
    const hollandPercentages = calculateHollandPercentages(
      session.results || [],
    );

    const cleanPatientName = session.patientName
      .replace(/\s*\(.*?\)\s*/g, '')
      .trim();

    // sessionResults ya está ordenado DESC — tomamos los últimos 2 (menores puntajes)
    const bottomAreas = sessionResults.slice(-2).map((res) => {
      const normalizedCategoryId = normalizeCategoryId(res.categoryId);
      const catInfo = categoriesById.get(normalizedCategoryId);
      return {
        title: catInfo ? catInfo.title : normalizedCategoryId,
        percentage: normalizePercentage(res.percentage),
      };
    });

    return {
      patientName: cleanPatientName,
      patientEmail: email,
      hollandCode: session.hollandCode ?? undefined,
      hollandPercentages,
      topResults: formattedResults,
      bottomAreas,
      summary,
      tripletInsight,
      strengths: Array.from(new Set(strengths)).slice(0, 6),
    };
  }

  private async buildTripletInsight(
    topResults: Array<{ categoryId: string }>,
    categoriesById: Map<
      string,
      { categoryId: string; title: string; description: string }
    >,
  ): Promise<ReportTripletInsight | null> {
    if (topResults.length < TOP_RESULTS_COUNT) {
      return null;
    }

    const areaNames = topResults
      .slice(0, TOP_RESULTS_COUNT)
      .map((result) => {
        const normalizedId = normalizeCategoryId(result.categoryId);
        return (
          AREA_BY_CATEGORY_ID[normalizedId] ??
          categoriesById.get(normalizedId)?.title ??
          normalizedId
        );
      })
      .filter(Boolean);

    if (areaNames.length < TOP_RESULTS_COUNT) {
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

    const profileStrength = this.getProfileStrength(
      primary.title,
      primary.percentage,
    );

    const recommendation = this.getRecommendation(rankedAreas);

    return {
      primaryTitle: primary.title,
      primaryPercentage: primary.percentage,
      profileStrength,
      recommendation,
      rankedAreas,
    };
  }

  private getProfileStrength(primaryTitle: string, percentage: number): string {
    if (percentage >= HIGH_AFFINITY_THRESHOLD) {
      return `Mostras una inclinacion muy marcada hacia ${primaryTitle}, con motivacion sostenida y alta consistencia.`;
    }
    if (percentage >= MODERATE_AFFINITY_THRESHOLD) {
      return `Presentas una afinidad clara hacia ${primaryTitle}, con una base solida para seguir explorando esta area.`;
    }
    return `Tu perfil es versatil y muestra interes distribuido, con ${primaryTitle} como punto de partida inicial.`;
  }

  private getRecommendation(rankedAreas: { title: string }[]): string {
    if (rankedAreas.length >= 2) {
      return `Priorizá experiencias concretas en ${rankedAreas[0].title} y contrastalas con ${rankedAreas[1].title} para validar ajuste e interes real.`;
    }
    return `Avanzá con actividades de exploracion guiada en ${rankedAreas[0].title} para transformar afinidad en criterio vocacional.`;
  }
}

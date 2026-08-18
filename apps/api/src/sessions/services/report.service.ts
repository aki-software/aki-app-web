import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VocationalCategory } from '../../categories/entities/vocational-category.entity.js';
import { TresAreasService } from '../../tres-areas/tres-areas.service.js';
import {
  CategoryResult,
  ParsedDescriptionBlock,
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
  SERV: 'Servicios y Acomodación',
  PROT: 'Proteccion',
  PHYS: 'Desempeno fisico',
  IND: 'Industrial',
  MECH: 'Mecanica',
  NAT: 'Plantas y animales',
  LEAD: 'Liderazgo',
  SCI: 'Cientifico',
  SAL: 'Ventas',
  BUS: 'Negocios y detalle',
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

    // Los resultados ya vienen ordenados por el motor psicométrico
    // (rawScore → weightedScore → categoryId). No re-ordenar aquí.
    const sessionResults = session.results || [];
    const topResults = sessionResults.slice(0, TOP_RESULTS_COUNT);

    const strengths: string[] = [];

    const formattedResults: CategoryResult[] = topResults.map((res) => {
      const normalizedCategoryId = normalizeCategoryId(res.categoryId);
      const catInfo = categoriesById.get(normalizedCategoryId);
      const description = catInfo
        ? catInfo.description
        : res.materialSnippet || 'Información no disponible.';
      const parsedBlocks = this.buildCategoryBlocks(catInfo, description);
      const canonicalCompetencies = this.canonicalCompetencies(catInfo);
      const blockSkills =
        canonicalCompetencies ??
        parsedBlocks
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
        categoryId: normalizedCategoryId,
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

  private buildCategoryBlocks(
    category: VocationalCategory | undefined,
    description: string,
  ): ParsedDescriptionBlock[] {
    const occupations = category?.occupations?.filter(Boolean) ?? [];
    const formalProfessions =
      category?.formalProfessions?.filter(Boolean) ?? [];
    const competencies = category?.competencies?.filter(Boolean) ?? [];
    if (
      !occupations.length ||
      !formalProfessions.length ||
      !competencies.length
    ) {
      return parseCategoryDescription(description);
    }

    return [
      { subtitle: 'Descripción breve', content: description },
      { subtitle: 'Ocupaciones y oficios', content: '', list: occupations },
      {
        subtitle: 'Profesiones técnicas o formales',
        content: '',
        list: formalProfessions,
      },
      { subtitle: 'Competencias importantes', content: '', list: competencies },
    ];
  }

  private canonicalCompetencies(
    category: VocationalCategory | undefined,
  ): string[] | null {
    const competencies = category?.competencies
      ?.map((item) => item.trim())
      .filter(Boolean);
    return competencies?.length ? competencies : null;
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
          categoriesById.get(normalizedId)?.title ??
          AREA_BY_CATEGORY_ID[normalizedId] ??
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
      keyInsight: match.keyInsight,
      competencies: match.competencies?.length
        ? match.competencies
        : match.tendencies,
      tendencies: match.tendencies,
      possibleJobs: splitList(match.possibleJobs),
      relatedProfessions: splitList(match.relatedProfessions),
      customSections: match.customSections,
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

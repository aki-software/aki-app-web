import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TresAreasCombination as TresAreasCombinationEntity } from '../entities/tres-areas-combination.entity';

export type TresAreasCombination = {
  id: string;
  title: string;
  categories: string[];
  narrative: string;
  tendencies: string[];
  possibleJobs: string;
  relatedProfessions: string;
};

@Injectable()
export class TresAreasService {
  private readonly logger = new Logger(TresAreasService.name);
  private readonly combinationsByKey = new Map<string, TresAreasCombination>();
  private cacheReady = false;

  constructor(
    @InjectRepository(TresAreasCombinationEntity)
    private readonly tresAreasRepo: Repository<TresAreasCombinationEntity>,
  ) {}

  async findByCategories(
    categories: string[],
  ): Promise<TresAreasCombination | null> {
    if (!Array.isArray(categories) || categories.length < 3) {
      return null;
    }

    await this.ensureCache();

    const key = this.buildKey(categories);
    return this.combinationsByKey.get(key) ?? null;
  }

  private async ensureCache(): Promise<void> {
    if (this.cacheReady) {
      return;
    }

    await this.loadContentFromDatabase();
    this.cacheReady = true;
  }

  private async loadContentFromDatabase(): Promise<void> {
    try {
      const combinations = await this.tresAreasRepo.find();
      this.combinationsByKey.clear();

      for (const item of combinations) {
        const categories = [item.area1, item.area2, item.area3].filter(Boolean);
        if (categories.length < 3) {
          continue;
        }

        this.combinationsByKey.set(item.combinationKey, {
          id: item.id,
          title: item.title,
          categories,
          narrative: item.narrative,
          tendencies: item.tendencies,
          possibleJobs: item.possibleJobs,
          relatedProfessions: item.relatedProfessions,
        });
      }

      this.logger.log(
        `Tres areas content loaded from DB: ${this.combinationsByKey.size} combinations`,
      );
    } catch (error) {
      this.logger.warn(
        `Tres areas DB content unavailable: ${(error as Error)?.message ?? 'unknown error'}`,
      );
    }
  }

  private buildKey(categories: string[]): string {
    return categories
      .map((name) => this.normalize(name))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .join('|');
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}

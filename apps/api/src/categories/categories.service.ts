import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';
import { VocationalCategory } from './entities/vocational-category.entity.js';
import { CategoryResponse } from '@akit/contracts';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(VocationalCategory)
    private categoryRepo: Repository<VocationalCategory>,
  ) {}

  async findAll(): Promise<CategoryResponse[]> {
    const categories = await this.categoryRepo.find({
      order: { categoryId: 'ASC' },
    });

    return categories.map((category) => this.toCategoryResponse(category));
  }

  async updateCategory(
    categoryId: string,
    updateData: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    const category = await this.categoryRepo.findOne({ where: { categoryId } });
    if (!category) {
      throw new NotFoundException(
        `Categoria con ID ${categoryId} no encontrada`,
      );
    }

    category.title = updateData.title;
    category.description = updateData.description;

    const savedCategory = await this.categoryRepo.save(category);
    return this.toCategoryResponse(savedCategory);
  }

  private toCategoryResponse(category: VocationalCategory): CategoryResponse {
    return {
      categoryId: category.categoryId,
      title: category.title,
      description: category.description,
    };
  }
}

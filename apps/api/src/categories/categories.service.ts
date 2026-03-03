import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VocationalCategory } from './entities/vocational-category.entity';

export interface CategoryPayload {
  categoryId: string;
  title: string;
  description: string;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(VocationalCategory)
    private categoryRepo: Repository<VocationalCategory>,
  ) {}

  async findAll(): Promise<VocationalCategory[]> {
    return this.categoryRepo.find({ order: { categoryId: 'ASC' } });
  }

  async updateCategory(
    categoryId: string,
    updateData: Pick<CategoryPayload, 'title' | 'description'>,
  ): Promise<VocationalCategory> {
    const category = await this.categoryRepo.findOne({ where: { categoryId } });
    if (!category) {
      throw new NotFoundException(
        `Categoria con ID ${categoryId} no encontrada`,
      );
    }

    category.title = updateData.title;
    category.description = updateData.description;

    return this.categoryRepo.save(category);
  }
}

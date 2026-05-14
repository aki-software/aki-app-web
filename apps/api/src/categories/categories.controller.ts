import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { UpdateCategoryDto } from './dto/update-category.dto';
import type { CategoryMaterialListResponse } from './categories.types';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get('material-teorico')
  async getMaterial(): Promise<CategoryMaterialListResponse> {
    const categories = await this.categoriesService.findAll();
    return {
      items: categories.map((c) => ({
        categoryId: c.categoryId,
        title: c.title,
        text: c.description,
      })),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':categoryId')
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() updateData: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(categoryId, updateData);
  }
}

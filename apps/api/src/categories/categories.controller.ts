import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CategoriesService } from './categories.service.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryMaterialListResponse } from '@akit/contracts';

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
      categoryId: 'ALL',
      materials: categories.map((c) => ({
        id: c.categoryId,
        title: c.title,
        url: '#',
        type: 'TEXT',
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

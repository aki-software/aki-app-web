import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get('material-teorico')
  async getMaterial() {
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
    @Body() updateData: { title: string; description: string },
  ) {
    return this.categoriesService.updateCategory(categoryId, updateData);
  }
}

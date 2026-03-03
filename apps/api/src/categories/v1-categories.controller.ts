import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller()
export class V1CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('categories')
  async getCategories() {
    // La App espera una lista de categorías
    return this.categoriesService.findAll();
  }

  @Get('material-teorico')
  async getMaterial() {
    const categories = await this.categoriesService.findAll();
    // La App espera un objeto con un array "items" y campos específicos
    return {
      items: categories.map((c) => ({
        categoryId: c.categoryId,
        title: c.title,
        text: c.description, // La App usa 'text' en lugar de 'description'
      })),
    };
  }
}

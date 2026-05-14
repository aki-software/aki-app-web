import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service.js';
import { CategoriesController } from './categories.controller.js';
import { VocationalCategory } from './entities/vocational-category.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([VocationalCategory])],
  providers: [CategoriesService],
  controllers: [CategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}

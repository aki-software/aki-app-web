import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { V1CategoriesController } from './v1-categories.controller';
import { VocationalCategory } from './entities/vocational-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VocationalCategory])],
  providers: [CategoriesService],
  controllers: [CategoriesController, V1CategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}

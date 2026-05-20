import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TresAreasCombination } from './entities/tres-areas-combination.entity.js';
import { TresAreasService } from './tres-areas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([TresAreasCombination])],
  providers: [TresAreasService],
  exports: [TresAreasService, TypeOrmModule],
})
export class TresAreasModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TresAreasCombination } from './entities/tres-areas-combination.entity.js';
import { TresAreasController } from './tres-areas.controller.js';
import { TresAreasService } from './tres-areas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([TresAreasCombination])],
  controllers: [TresAreasController],
  providers: [TresAreasService],
  exports: [TresAreasService, TypeOrmModule],
})
export class TresAreasModule {}

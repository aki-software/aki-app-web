import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfService } from './services/pdf.service';
import { StorageService } from './services/storage.service';
import { TresAreasService } from './services/tres-areas.service';
import { TresAreasCombination } from './entities/tres-areas-combination.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([TresAreasCombination])],
  providers: [PdfService, StorageService, TresAreasService],
  exports: [PdfService, StorageService, TresAreasService],
})
export class CommonModule {}

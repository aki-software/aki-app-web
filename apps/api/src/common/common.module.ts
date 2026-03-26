import { Module, Global } from '@nestjs/common';
import { PdfService } from './services/pdf.service';
import { StorageService } from './services/storage.service';

@Global()
@Module({
  providers: [PdfService, StorageService],
  exports: [PdfService, StorageService],
})
export class CommonModule {}

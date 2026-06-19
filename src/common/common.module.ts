import { Module } from '@nestjs/common';
import { AuditInterceptor } from './audit/audit.interceptor';
import { FilterBuilderService } from './filters/filter-builder.service';
import { ExcelExportService } from './excel/excel-export.service';

@Module({
  providers: [FilterBuilderService, ExcelExportService, AuditInterceptor],
  exports: [FilterBuilderService, ExcelExportService, AuditInterceptor],
})
export class CommonModule {}

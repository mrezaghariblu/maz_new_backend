import { Module } from '@nestjs/common';
import { AuditInterceptor } from './audit/audit.interceptor';
import { FilterBuilderService } from './filters/filter-builder.service';
import { ExcelExportService } from './excel/excel-export.service';
import { DisabilityService } from './disability/disability.service';

@Module({
  providers: [
    FilterBuilderService,
    ExcelExportService,
    AuditInterceptor,
    DisabilityService,
  ],
  exports: [
    FilterBuilderService,
    ExcelExportService,
    AuditInterceptor,
    DisabilityService,
  ],
})
export class CommonModule {}

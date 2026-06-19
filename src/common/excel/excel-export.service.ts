import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { ExcelColumnDto } from '../filters/smart-filter.dto';

export interface ExcelExportOptions {
  data: Record<string, unknown>[];
  columns: ExcelColumnDto[];
  sheetName?: string;
  filename?: string;
  res: Response;
}

@Injectable()
export class ExcelExportService {
  async export(options: ExcelExportOptions): Promise<void> {
    const { data, res, sheetName = 'داده‌ها', filename = 'export' } = options;

    const cols = [...options.columns].sort((a, b) => a.order - b.order);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EduSystem';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true }],
    });

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A5F' },
      },
      alignment: {
        horizontal: 'center',
        vertical: 'middle',
        readingOrder: 'rtl',
      },
      border: {
        top: { style: 'thin', color: { argb: 'FF93C5FD' } },
        bottom: { style: 'thin', color: { argb: 'FF93C5FD' } },
        left: { style: 'thin', color: { argb: 'FF93C5FD' } },
        right: { style: 'thin', color: { argb: 'FF93C5FD' } },
      },
    };

    sheet.columns = cols.map((c) => ({
      header: c.header,
      key: c.field,
      width: c.width ?? 18,
    }));

    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      Object.assign(cell, headerStyle);
    });

    data.forEach((item, idx) => {
      const rowData = cols.reduce(
        (acc, col) => {
          acc[col.field] = this.formatValue(item[col.field], col.format);
          return acc;
        },
        {} as Record<string, unknown>,
      );

      const row = sheet.addRow(rowData);
      row.height = 22;

      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF0F7FF';
      row.eachCell((cell) => {
        cell.style = {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
          alignment: {
            horizontal: 'right',
            vertical: 'middle',
            readingOrder: 'rtl',
          },
          font: { size: 10 },
          border: {
            top: { style: 'hair', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          },
        };
      });
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: cols.length },
    };

    const safeName = encodeURIComponent(filename);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${safeName}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  private formatValue(value: unknown, format?: string): unknown {
    if (value === null || value === undefined) return '';
    if (format === 'date' && value instanceof Date) {
      return value.toLocaleDateString('fa-IR');
    }
    if (format === 'boolean') return value ? 'بله' : 'خیر';
    return value;
  }
}

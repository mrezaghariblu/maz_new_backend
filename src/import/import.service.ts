// src/import/import.service.ts
import {
  BadRequestException, Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { StudentsService } from '../students/students.service';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../auth/auth.service';

// ──────────────────────────────────────────────────────────────
// ستون‌های template اکسل دانش‌آموز
// ──────────────────────────────────────────────────────────────
const STUDENT_COLUMNS = [
  { header: 'کد ملی*', key: 'nationalCode', width: 14 },
  { header: 'نام*', key: 'firstName', width: 14 },
  { header: 'نام خانوادگی*', key: 'lastName', width: 16 },
  { header: 'جنسیت* (پسر/دختر)', key: 'gender', width: 18 },
  { header: 'سال تولد شمسی*', key: 'birthYearShamsi', width: 16 },
  { header: 'ماه تولد', key: 'birthMonth', width: 12 },
  { header: 'روز تولد', key: 'birthDay', width: 12 },
  { header: 'نام ولی قانونی', key: 'guardianName', width: 18 },
  { header: 'کد ملی ولی', key: 'guardianNationalCode', width: 14 },
  { header: 'تلفن ولی', key: 'guardianPhone', width: 14 },
  { header: 'نام مادر', key: 'secondGuardianName', width: 18 },
  { header: 'کد ملی مادر', key: 'secondGuardianNationalCode', width: 14 },
  { header: 'تلفن مادر', key: 'secondGuardianPhone', width: 14 },
  { header: 'آدرس', key: 'address', width: 30 },
  { header: 'تلفن منزل', key: 'homePhone', width: 14 },
  { header: 'نوع معلولیت (با کاما جدا کنید)', key: 'disabilityLabels', width: 30 },
  { header: 'نوع حضور (مدرسه/کمیسیون)', key: 'attendanceType', width: 22 },
  { header: 'توضیحات', key: 'notes', width: 30 },
];

// ──────────────────────────────────────────────────────────────
// ستون‌های template اکسل پرسنل
// ──────────────────────────────────────────────────────────────
const PERSONNEL_COLUMNS = [
  { header: 'کد ملی*', key: 'nationalCode', width: 14 },
  { header: 'نام*', key: 'firstName', width: 14 },
  { header: 'نام خانوادگی*', key: 'lastName', width: 16 },
  { header: 'نام پدر', key: 'fatherName', width: 14 },
  { header: 'جنسیت* (مرد/زن)', key: 'gender', width: 16 },
  { header: 'کد پرسنلی', key: 'personnelCode', width: 14 },
  { header: 'نوع استخدام (رسمی/پیمانی/خرید خدمات)', key: 'employmentTypeLabel', width: 30 },
  { header: 'عنوان پست', key: 'jobPositionLabel', width: 22 },
  { header: 'سال تولد شمسی', key: 'birthYearShamsi', width: 16 },
  { header: 'ماه تولد', key: 'birthMonth', width: 12 },
  { header: 'روز تولد', key: 'birthDay', width: 12 },
  { header: 'شماره تماس', key: 'phone', width: 14 },
  { header: 'مدرک تحصیلی', key: 'educationDegreeLabel', width: 18 },
  { header: 'رشته تحصیلی', key: 'fieldOfStudy', width: 18 },
  { header: 'ساعت موظف', key: 'requiredHours', width: 12 },
  { header: 'آدرس', key: 'address', width: 30 },
];

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private studentsService: StudentsService,
    private usersService: UsersService,
  ) {}

  // ─── دانلود template ──────────────────────────────────────
  async downloadStudentTemplate(res: Response) {
    const wb = this.makeWorkbook('دانش‌آموزان', STUDENT_COLUMNS, [
      ['۱۲۳۴۵۶۷۸۹۰', 'علی', 'محمدی', 'پسر', '1390', '3', '15', 'حسن محمدی', '۰۹۱۲۰۰۰۰۰۰۱', '۰۹۱۲۰۰۰۰۰۰۲', 'زهرا احمدی', '۰۹۱۳۰۰۰۰۰۰۱', '۰۹۱۳۰۰۰۰۰۰۲', 'تهران، خیابان آزادی', '02100000001', 'اوتیسم', 'مدرسه', ''],
    ]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.xlsx');
    await wb.xlsx.write(res);
  }

  async downloadPersonnelTemplate(res: Response) {
    const wb = this.makeWorkbook('پرسنل', PERSONNEL_COLUMNS, [
      ['۱۲۳۴۵۶۷۸۹۰', 'محمد', 'رضایی', 'علی', 'مرد', '', 'رسمی', 'آموزگار', '1360', '5', '10', '09120000001', 'کارشناسی', 'علوم تربیتی', '24', ''],
    ]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=personnel_import_template.xlsx');
    await wb.xlsx.write(res);
  }

  // ─── پیش‌نمایش (parse بدون ذخیره) ───────────────────────
  async previewStudents(buffer: Buffer) {
    const rows = await this.parseExcel(buffer, STUDENT_COLUMNS);
    const preview = rows.map((row, i) => ({
      rowNum: i + 2,
      ...row,
      errors: this.validateStudentRow(row),
    }));
    return {
      total: preview.length,
      valid: preview.filter(r => !r.errors.length).length,
      invalid: preview.filter(r => r.errors.length > 0).length,
      rows: preview,
    };
  }

  async previewPersonnel(buffer: Buffer) {
    const rows = await this.parseExcel(buffer, PERSONNEL_COLUMNS);
    const preview = rows.map((row, i) => ({
      rowNum: i + 2,
      ...row,
      errors: this.validatePersonnelRow(row),
    }));
    return {
      total: preview.length,
      valid: preview.filter(r => !r.errors.length).length,
      invalid: preview.filter(r => r.errors.length > 0).length,
      rows: preview,
    };
  }

  // ─── import واقعی (فقط ردیف‌های معتبر) ───────────────────
  async importStudents(buffer: Buffer, centerId: number | undefined, academicYearId: number | undefined, requester: JwtPayload) {
    const preview = await this.previewStudents(buffer);
    const validRows = preview.rows.filter(r => !r.errors.length);
    if (!validRows.length) throw new BadRequestException('هیچ ردیف معتبری برای وارد کردن وجود ندارد');

    const results: { rowNum: number; status: 'created' | 'duplicate' | 'error'; message?: string }[] = [];

    for (const row of validRows) {
      try {
        const r = row as any;
        const dto: any = {
          nationalCode: String(r.nationalCode ?? '').replace(/[۰-۹]/g, (d: string) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))),
          firstName:    r.firstName,
          lastName:     r.lastName,
          gender:       r.gender === 'پسر' ? 'MALE' : 'FEMALE',
          birthYearShamsi: r.birthYearShamsi ? +r.birthYearShamsi : undefined,
          birthMonth:   r.birthMonth ? +r.birthMonth : undefined,
          birthDay:     r.birthDay ? +r.birthDay : undefined,
          guardianName: r.guardianName,
          guardianNationalCode: r.guardianNationalCode,
          guardianPhone: r.guardianPhone,
          secondGuardianName: r.secondGuardianName,
          secondGuardianNationalCode: r.secondGuardianNationalCode,
          secondGuardianPhone: r.secondGuardianPhone,
          address:      r.address,
          homePhone:    r.homePhone,
          attendanceType: r.attendanceType === 'کمیسیون' ? 'SPECIAL_COMMISSION_18' : 'SCHOOL_PRESENCE',
          notes:        r.notes,
          centerId,
          academicYearId,
        };
        await this.studentsService.create(dto, requester);
        results.push({ rowNum: row.rowNum, status: 'created' });
      } catch (e: any) {
        if (e.code === 'P2002' || e.status === 409) {
          results.push({ rowNum: row.rowNum, status: 'duplicate', message: 'کد ملی تکراری' });
        } else {
          results.push({ rowNum: row.rowNum, status: 'error', message: e.message });
        }
      }
    }

    return {
      created:   results.filter(r => r.status === 'created').length,
      duplicate: results.filter(r => r.status === 'duplicate').length,
      error:     results.filter(r => r.status === 'error').length,
      details:   results,
    };
  }

  // ─── helpers ──────────────────────────────────────────────
  private makeWorkbook(sheetName: string, columns: typeof STUDENT_COLUMNS, sampleRows: any[][]) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });

    ws.columns = columns;

    // header style
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006B6B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    ws.getRow(1).height = 32;

    // sample row
    sampleRows.forEach(row => ws.addRow(row));

    return wb;
  }

  private async parseExcel(buffer: Buffer, columns: typeof STUDENT_COLUMNS): Promise<Record<string, string>[]> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const ws = wb.worksheets[0];
    const rows: Record<string, string>[] = [];

    ws.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // skip header
      const obj: Record<string, string> = {};
      columns.forEach((col, i) => {
        obj[col.key] = String(row.getCell(i + 1).value ?? '').trim();
      });
      if (Object.values(obj).some(v => v)) rows.push(obj); // skip empty rows
    });

    return rows;
  }

  private validateStudentRow(row: Record<string, string>): string[] {
    const errs: string[] = [];
    const nc = row.nationalCode?.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    if (!nc || !/^\d{10}$/.test(nc)) errs.push('کد ملی نامعتبر است (باید ۱۰ رقم باشد)');
    if (!row.firstName) errs.push('نام الزامی است');
    if (!row.lastName) errs.push('نام خانوادگی الزامی است');
    if (!['پسر', 'دختر'].includes(row.gender)) errs.push('جنسیت باید «پسر» یا «دختر» باشد');
    if (!row.birthYearShamsi || isNaN(+row.birthYearShamsi)) errs.push('سال تولد شمسی الزامی و عددی است');
    return errs;
  }

  private validatePersonnelRow(row: Record<string, string>): string[] {
    const errs: string[] = [];
    const nc = row.nationalCode?.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    if (!nc || !/^\d{10}$/.test(nc)) errs.push('کد ملی نامعتبر است');
    if (!row.firstName) errs.push('نام الزامی است');
    if (!row.lastName) errs.push('نام خانوادگی الزامی است');
    if (!['مرد', 'زن'].includes(row.gender)) errs.push('جنسیت باید «مرد» یا «زن» باشد');
    return errs;
  }
}

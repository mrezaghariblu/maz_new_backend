// src/students/students.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilterBuilderService } from '../common/filters/filter-builder.service';
import { ExcelExportService } from '../common/excel/excel-export.service';
import {
  SmartFilterDto,
  ExcelExportDto,
} from '../common/filters/smart-filter.dto';
import { JwtPayload } from '../auth/auth.service';
import { Prisma, UserType } from '@prisma/client';
import { Response } from 'express';
import {
  CreateStudentDto,
  EnrollStudentDto,
  UpdateStudentDto,
} from './dto/students.dto';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private filterBuilder: FilterBuilderService,
    private excelExport: ExcelExportService,
  ) {}

  async findAll(dto: SmartFilterDto, requester: JwtPayload) {
    const { where, orderBy, skip, take } = this.filterBuilder.build(dto);

    const scopeWhere =
      requester.type === UserType.SUPERUSER
        ? where
        : {
            AND: [
              where,
              {
                enrollments: {
                  some: { centerId: { in: requester.centerIds } },
                },
              },
            ],
          };

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where: scopeWhere as Prisma.StudentWhereInput,
        orderBy,
        skip,
        take,
        include: {
          enrollments: {
            orderBy: { enrolledAt: 'desc' },
            take: 1,
            include: {
              center: { select: { id: true, name: true, city: true } },
              academicYear: { select: { id: true, label: true } },
            },
          },
          studentStatusHistory: {
            orderBy: { effectiveDate: 'desc' },
            take: 1,
            include: { statusType: { select: { label: true, code: true } } },
          },
        },
      }),
      this.prisma.student.count({
        where: scopeWhere as Prisma.StudentWhereInput,
      }),
    ]);

    return {
      data,
      total,
      page: dto.page ?? 1,
      pageSize: take,
      pageCount: Math.ceil(total / take),
    };
  }

  async findOne(id: number) {
    const s = await this.prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          orderBy: { enrolledAt: 'desc' },
          include: { center: true, academicYear: true },
        },
        studentStatusHistory: {
          orderBy: { effectiveDate: 'desc' },
          include: {
            statusType: true,
            academicYear: { select: { id: true, label: true } },
          },
        },
      },
    });
    if (!s) throw new NotFoundException('دانش‌آموز یافت نشد');
    return s;
  }

  async create(dto: CreateStudentDto) {
    const exists = await this.prisma.student.findUnique({
      where: { nationalCode: dto.nationalCode },
    });
    if (exists)
      throw new ConflictException(`کد ملی "${dto.nationalCode}" تکراری است`);
    return this.prisma.student.create({
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      },
    });
  }

  async update(id: number, dto: UpdateStudentDto) {
    await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
      },
    });
  }

  async enroll(studentId: number, dto: EnrollStudentDto) {
    await this.findOne(studentId);

    const existing = await this.prisma.studentEnrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId: dto.academicYearId,
        },
      },
    });
    if (existing)
      throw new ConflictException(
        'دانش‌آموز در این سال تحصیلی قبلاً ثبت‌نام شده',
      );

    return this.prisma.studentEnrollment.create({
      data: {
        studentId,
        centerId: dto.centerId,
        academicYearId: dto.academicYearId,
        grade: dto.grade,
        field: dto.field,
      },
    });
  }

  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async exportExcel(dto: ExcelExportDto, requester: JwtPayload, res: Response) {
    const result = await this.findAll(
      { ...dto, page: 1, pageSize: 10000 },
      requester,
    );
    const flat = (result.data as any[]).map((s) => ({
      ...s,
      fullName: `${s.firstName} ${s.lastName}`,
      currentCenter: s.enrollments[0]?.center?.name ?? '—',
      currentGrade: s.enrollments[0]?.grade ?? '—',
      currentField: s.enrollments[0]?.field ?? '—',
      currentYear: s.enrollments[0]?.academicYear?.label ?? '—',
      currentStatus: s.studentStatusHistory[0]?.statusType?.label ?? '—',
      genderLabel: s.gender === 'MALE' ? 'مرد' : 'زن',
    }));
    await this.excelExport.export({
      data: flat,
      columns: dto.columns,
      sheetName: dto.sheetName,
      filename: dto.filename ?? 'students',
      res,
    });
  }
}

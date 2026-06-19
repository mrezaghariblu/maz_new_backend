// src/centers/centers.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCenterDto, UpdateCenterDto } from './dto/center.dto';
import { FilterBuilderService } from '../common/filters/filter-builder.service';
import { ExcelExportService } from '../common/excel/excel-export.service';
import {
  SmartFilterDto,
  ExcelExportDto,
} from '../common/filters/smart-filter.dto';
import { Response } from 'express';
import { JwtPayload } from '../auth/auth.service';
import { Prisma, UserType } from '@prisma/client';

@Injectable()
export class CentersService {
  constructor(
    private prisma: PrismaService,
    private filterBuilder: FilterBuilderService,
    private excelExport: ExcelExportService,
  ) {}

  async findAll(dto: SmartFilterDto, requester: JwtPayload) {
    const { where, orderBy, skip, take } = this.filterBuilder.build(dto);

    // CENTER_MANAGER فقط مراکز خودش را می‌بیند
    const scopeWhere =
      requester.type === UserType.SUPERUSER
        ? where
        : { AND: [where, { id: { in: requester.centerIds } }] };

    const [data, total] = await Promise.all([
      this.prisma.center.findMany({
        where: scopeWhere as Prisma.CenterWhereInput,
        orderBy,
        skip,
        take,
        include: {
          _count: {
            select: {
              userAssignments: { where: { revokedAt: null } },
              studentEnrollments: true,
            },
          },
          centerStatuses: {
            orderBy: { effectiveDate: 'desc' },
            take: 1,
            include: { statusType: true },
          },
        },
      }),
      this.prisma.center.count({
        where: scopeWhere as Prisma.CenterWhereInput,
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
    const center = await this.prisma.center.findUnique({
      where: { id },
      include: {
        userAssignments: {
          where: { revokedAt: null },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                userType: true,
              },
            },
          },
        },
        centerStatuses: {
          orderBy: { effectiveDate: 'desc' },
          include: { statusType: true, academicYear: true },
        },
      },
    });
    if (!center) throw new NotFoundException('مرکز یافت نشد');
    return center;
  }

  async create(dto: CreateCenterDto) {
    const exists = await this.prisma.center.findUnique({
      where: { code: dto.code },
    });
    if (exists) throw new ConflictException(`کد مرکز "${dto.code}" تکراری است`);
    return this.prisma.center.create({ data: dto });
  }

  async update(id: number, dto: UpdateCenterDto) {
    await this.findOne(id);
    return this.prisma.center.update({ where: { id }, data: dto });
  }

  // غیرفعال کردن (نه حذف واقعی)
  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.center.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async exportExcel(dto: ExcelExportDto, requester: JwtPayload, res: Response) {
    const result = await this.findAll(
      { ...dto, page: 1, pageSize: 10000 },
      requester,
    );
    const flat = (result.data as any[]).map((c) => ({
      ...c,
      staffCount: c._count.userAssignments,
      studentCount: c._count.studentEnrollments,
      currentStatus: c.centerStatuses[0]?.statusType?.label ?? '—',
      typeLabel: this.typeLabel(c.type),
      isActiveLabel: c.isActive ? 'فعال' : 'غیرفعال',
    }));
    await this.excelExport.export({
      data: flat,
      columns: dto.columns,
      sheetName: dto.sheetName,
      filename: dto.filename ?? 'centers',
      res,
    });
  }

  private typeLabel(t: string) {
    const m: Record<string, string> = {
      PRIMARY: 'دبستان',
      MIDDLE: 'متوسطه اول',
      HIGH: 'دبیرستان',
      VOCATIONAL: 'هنرستان',
    };
    return m[t] ?? t;
  }
}

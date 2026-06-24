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

const CENTER_SELECT = {
  id: true,
  name: true,
  code: true,
  province: true,
  city: true,
  address: true,
  phone: true,
  bankAccountNumber: true,
  shabaNumber: true,
  establishedYear: true,
  preSchoolCode: true,
  primaryCode: true,
  firstMiddleCode: true,
  firstMiddleVocationalCode: true,
  secondMiddleSpecialVocationalCode: true,
  secondMiddleCode: true,
  isActive: true,
  createdAt: true,
  centerType: true,
  district: true,
  _count: {
    select: {
      userAssignments: { where: { revokedAt: null } },
      studentEnrollments: true,
    },
  },
  centerStatuses: {
    orderBy: { effectiveDate: 'desc' as const },
    take: 1,
    include: { statusType: true },
  },
  // مدیر فعلی مرکز — برای نمایش نام و تماس در لیست (بدون تکرار داده)
  userAssignments: {
    where: {
      revokedAt: null,
      isPrimary: true,
      user: { userType: UserType.CENTER_MANAGER },
      academicYear: { isActive: true },
    },
    take: 1,
    select: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
  },
} satisfies Prisma.CenterSelect;

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
        select: CENTER_SELECT,
      }),
      this.prisma.center.count({
        where: scopeWhere as Prisma.CenterWhereInput,
      }),
    ]);

    const shaped = data.map((c) => this.withManagerInfo(c));

    return {
      data: shaped,
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
        centerType: true,
        district: true,
        userAssignments: {
          where: { revokedAt: null },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
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
      typeLabel: c.centerType?.label ?? '—',
      districtLabel: c.district?.label ?? '—',
      managerName: c.managerName ?? '—',
      managerPhone: c.managerPhone ?? '—',
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

  // نام و تلفن مدیر فعلی مرکز را به‌جای فیلد جدا، از روی
  // userAssignments استخراج می‌کند (بدون تکرار داده در دیتابیس)
  private withManagerInfo(center: any) {
    const manager = center.userAssignments?.[0]?.user ?? null;
    const { userAssignments, ...rest } = center;
    return {
      ...rest,
      managerName: manager ? `${manager.firstName} ${manager.lastName}` : null,
      managerPhone: manager?.phone ?? null,
    };
  }
}

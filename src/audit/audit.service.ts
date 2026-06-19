// src/audit/audit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilterBuilderService } from '../common/filters/filter-builder.service';
import { SmartFilterDto } from '../common/filters/smart-filter.dto';
import { JwtPayload } from '../auth/auth.service';
import { Prisma, UserType } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private filterBuilder: FilterBuilderService,
  ) {}

  async findAll(dto: SmartFilterDto, requester: JwtPayload) {
    const { where, orderBy, skip, take } = this.filterBuilder.build(dto);

    // CENTER_MANAGER فقط لاگ‌های مربوط به مراکز خودش را می‌بیند
    // (از طریق academicYearId و entity)
    const scopeWhere =
      requester.type === UserType.SUPERUSER
        ? where
        : { AND: [where, { performedById: requester.sub }] };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: scopeWhere as Prisma.AuditLogWhereInput,
        orderBy: orderBy ?? { createdAt: 'desc' },
        skip,
        take,
        include: {
          performedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              userType: true,
            },
          },
          academicYear: { select: { id: true, label: true } },
        },
      }),
      this.prisma.auditLog.count({
        where: scopeWhere as Prisma.AuditLogWhereInput,
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

  // خلاصه آماری برای داشبورد
  async summary(academicYearId: number) {
    const [total, byAction, byEntity, recentChanges] = await Promise.all([
      this.prisma.auditLog.count({ where: { academicYearId } }),

      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { academicYearId },
        _count: { action: true },
      }),

      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where: { academicYearId },
        _count: { entity: true },
        orderBy: { _count: { entity: 'desc' } },
        take: 5,
      }),

      this.prisma.auditLog.findMany({
        where: { academicYearId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          performedBy: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return { total, byAction, byEntity, recentChanges };
  }
}
// src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto, AnalyticsDimension, AnalyticsEntity } from './dto/analytics.dto';
import { JwtPayload } from '../auth/auth.service';
import { UserType } from '@prisma/client';

export interface AnalyticsRow {
  key: string;
  label: string;
  count: number;
  percentage: number;
  children?: AnalyticsRow[];
}

export interface AnalyticsResult {
  entity: string;
  dimensions: string[];
  total: number;
  rows: AnalyticsRow[];
  generatedAt: string;
}

export interface DashboardSummary {
  totalStudents: number;
  totalPersonnel: number;
  totalCenters: number;
  totalClasses: number;
  unassignedStudents: number;
  byDisability: AnalyticsRow[];
  byGrade: AnalyticsRow[];
  byDistrict: AnalyticsRow[];
  byGender: AnalyticsRow[];
  personnelByJobPosition: AnalyticsRow[];
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ─── گزارش چندبعدی ────────────────────────────────────────
  async query(dto: AnalyticsQueryDto, requester: JwtPayload): Promise<AnalyticsResult> {
    const scopeCenterIds =
      requester.type === UserType.CENTER_MANAGER ? requester.centerIds : null;
    const centerId = dto.centerId ?? (scopeCenterIds?.length === 1 ? scopeCenterIds[0] : undefined);

    switch (dto.entity) {
      case AnalyticsEntity.STUDENT:
        return this.queryStudents(dto, centerId, scopeCenterIds);
      case AnalyticsEntity.USER:
        return this.queryUsers(dto, centerId, scopeCenterIds);
      case AnalyticsEntity.CENTER:
        return this.queryCenters(dto);
      default:
        throw new Error('موجودیت نامعتبر');
    }
  }

  // ─── خلاصه داشبورد سوپریوزر ──────────────────────────────
  async getSuperuserSummary(academicYearId?: number): Promise<DashboardSummary> {
    const yearFilter = academicYearId
      ? { classAssignments: { some: { academicYearId, revokedAt: null } } }
      : {};

    const [
      totalStudents, totalPersonnel, totalCenters, totalClasses, unassignedStudents,
      studentsByDisability, studentsByGrade, studentsByDistrict, studentsByGender,
      personnelByJob,
    ] = await Promise.all([
      this.prisma.student.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true, userType: { not: 'STUDENT' } } }),
      this.prisma.center.count({ where: { isActive: true } }),
      this.prisma.classRoom.count({ where: { isActive: true } }),
      academicYearId
        ? this.prisma.student.count({
            where: { isActive: true, classAssignments: { none: { academicYearId, revokedAt: null } } },
          })
        : 0,
      this.prisma.studentDisability.groupBy({
        by: ['disabilityTypeId'],
        _count: { studentId: true },
        where: { student: { isActive: true } },
      }),
      this.prisma.student.groupBy({
        by: ['gradeId'],
        _count: { id: true },
        where: { isActive: true, gradeId: { not: null } },
      }),
      this.prisma.student.groupBy({
        by: ['districtId'],
        _count: { id: true },
        where: { isActive: true },
      }),
      this.prisma.student.groupBy({
        by: ['gender'],
        _count: { id: true },
        where: { isActive: true },
      }),
      this.prisma.user.groupBy({
        by: ['jobPositionId'],
        _count: { id: true },
        where: { isActive: true, userType: { not: 'STUDENT' }, jobPositionId: { not: null } },
      }),
    ]);

    // resolve labels
    const disabilityIds = studentsByDisability.map(r => r.disabilityTypeId).filter(Boolean) as number[];
    const gradeIds      = studentsByGrade.map(r => r.gradeId).filter(Boolean) as number[];
    const districtIds   = studentsByDistrict.map(r => r.districtId).filter(Boolean) as number[];
    const jobIds        = personnelByJob.map(r => r.jobPositionId).filter(Boolean) as number[];

    const [disabilityTypes, grades, districts, jobs] = await Promise.all([
      this.prisma.lookupValue.findMany({ where: { id: { in: disabilityIds } }, select: { id: true, label: true } }),
      this.prisma.grade.findMany({ where: { id: { in: gradeIds } }, select: { id: true, label: true } }),
      this.prisma.lookupValue.findMany({ where: { id: { in: districtIds } }, select: { id: true, label: true } }),
      this.prisma.lookupValue.findMany({ where: { id: { in: jobIds } }, select: { id: true, label: true } }),
    ]);

    const labelMap = (arr: { id: number; label: string }[]) =>
      new Map(arr.map(x => [x.id, x.label]));

    const dMap  = labelMap(disabilityTypes);
    const gMap  = labelMap(grades);
    const diMap = labelMap(districts);
    const jMap  = labelMap(jobs);

    const toRows = (arr: { key: number | string; count: number; label: string }[]): AnalyticsRow[] => {
      const total = arr.reduce((s, r) => s + r.count, 0);
      return arr
        .sort((a, b) => b.count - a.count)
        .map(r => ({ key: String(r.key), label: r.label, count: r.count, percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0 }));
    };

    return {
      totalStudents, totalPersonnel, totalCenters, totalClasses, unassignedStudents,
      byDisability: toRows(studentsByDisability.map(r => ({
        key: r.disabilityTypeId ?? 0, count: r._count.studentId, label: dMap.get(r.disabilityTypeId!) ?? 'نامشخص',
      }))),
      byGrade: toRows(studentsByGrade.map(r => ({
        key: r.gradeId ?? 0, count: r._count.id, label: gMap.get(r.gradeId!) ?? 'نامشخص',
      }))),
      byDistrict: toRows(studentsByDistrict.map(r => ({
        key: r.districtId ?? 0, count: r._count.id, label: diMap.get(r.districtId!) ?? 'نامشخص',
      }))),
      byGender: toRows(studentsByGender.map(r => ({
        key: r.gender, count: r._count.id, label: r.gender === 'MALE' ? 'پسر' : 'دختر',
      }))),
      personnelByJobPosition: toRows(personnelByJob.map(r => ({
        key: r.jobPositionId ?? 0, count: r._count.id, label: jMap.get(r.jobPositionId!) ?? 'نامشخص',
      }))),
    };
  }

  // ─── خلاصه داشبورد مدیر مرکز ──────────────────────────────
  async getCenterSummary(centerId: number, academicYearId?: number): Promise<{
    totalStudents: number;
    unassignedStudents: number;
    unassignedList: any[];
    byDisability: AnalyticsRow[];
    byGrade: AnalyticsRow[];
    byGender: AnalyticsRow[];
    totalClasses: number;
    totalPersonnel: number;
  }> {
    const [
      totalStudents, unassignedCount, totalPersonnel, totalClasses,
      studentsByDisability, studentsByGrade, studentsByGender,
    ] = await Promise.all([
      this.prisma.student.count({ where: { centerId, isActive: true } }),
      academicYearId
        ? this.prisma.student.count({ where: { centerId, isActive: true, classAssignments: { none: { academicYearId, revokedAt: null } } } })
        : 0,
      this.prisma.userCenterAssignment.count({ where: { centerId, revokedAt: null, user: { isActive: true } } }),
      this.prisma.classRoom.count({ where: { centerId, isActive: true } }),
      this.prisma.studentDisability.groupBy({
        by: ['disabilityTypeId'],
        _count: { studentId: true },
        where: { student: { centerId, isActive: true } },
      }),
      this.prisma.student.groupBy({
        by: ['gradeId'],
        _count: { id: true },
        where: { centerId, isActive: true, gradeId: { not: null } },
      }),
      this.prisma.student.groupBy({
        by: ['gender'],
        _count: { id: true },
        where: { centerId, isActive: true },
      }),
    ]);

    // لیست کلاسبندی‌نشده
    const unassignedList = academicYearId
      ? await this.prisma.student.findMany({
          where: { centerId, isActive: true, classAssignments: { none: { academicYearId, revokedAt: null } } },
          include: {
            grade: { select: { id: true, label: true } },
            disabilities: { include: { disabilityType: { select: { id: true, label: true } } } },
          },
          orderBy: [{ lastName: 'asc' }],
          take: 50,
        })
      : [];

    const disabilityIds = studentsByDisability.map(r => r.disabilityTypeId).filter(Boolean) as number[];
    const gradeIds      = studentsByGrade.map(r => r.gradeId).filter(Boolean) as number[];

    const [disabilityTypes, grades] = await Promise.all([
      this.prisma.lookupValue.findMany({ where: { id: { in: disabilityIds } }, select: { id: true, label: true } }),
      this.prisma.grade.findMany({ where: { id: { in: gradeIds } }, select: { id: true, label: true } }),
    ]);

    const dMap = new Map(disabilityTypes.map(x => [x.id, x.label]));
    const gMap = new Map(grades.map(x => [x.id, x.label]));

    const toRows = (arr: { key: number | string; count: number; label: string }[]): AnalyticsRow[] => {
      const total = arr.reduce((s, r) => s + r.count, 0);
      return arr.sort((a, b) => b.count - a.count)
        .map(r => ({ key: String(r.key), label: r.label, count: r.count, percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0 }));
    };

    return {
      totalStudents, unassignedStudents: unassignedCount, unassignedList, totalPersonnel, totalClasses,
      byDisability: toRows(studentsByDisability.map(r => ({ key: r.disabilityTypeId ?? 0, count: r._count.studentId, label: dMap.get(r.disabilityTypeId!) ?? 'نامشخص' }))),
      byGrade:      toRows(studentsByGrade.map(r => ({ key: r.gradeId ?? 0, count: r._count.id, label: gMap.get(r.gradeId!) ?? 'نامشخص' }))),
      byGender:     toRows(studentsByGender.map(r => ({ key: r.gender, count: r._count.id, label: r.gender === 'MALE' ? 'پسر' : 'دختر' }))),
    };
  }

  // ─── STUDENTS query ───────────────────────────────────────
  private async queryStudents(dto: AnalyticsQueryDto, centerId?: number, scopeCenterIds?: number[] | null): Promise<AnalyticsResult> {
    const where: any = { isActive: true };
    if (centerId) where.centerId = centerId;
    else if (scopeCenterIds) where.centerId = { in: scopeCenterIds };
    if (dto.academicYearId)
      where.classAssignments = { some: { academicYearId: dto.academicYearId, revokedAt: null } };

    const students = await this.prisma.student.findMany({
      where,
      include: {
        center: { select: { id: true, name: true } },
        district: { select: { id: true, label: true } },
        educationLevel: { select: { id: true, label: true } },
        grade: { select: { id: true, label: true } },
        disabilities: { include: { disabilityType: { select: { id: true, label: true, code: true } } } },
      },
    });

    const total = students.length;
    const rows  = this.groupBy(students, dto.dimensions, total);
    return { entity: 'STUDENT', dimensions: dto.dimensions, total, rows, generatedAt: new Date().toISOString() };
  }

  // ─── USERS query ──────────────────────────────────────────
  private async queryUsers(dto: AnalyticsQueryDto, centerId?: number, scopeCenterIds?: number[] | null): Promise<AnalyticsResult> {
    const assignWhere: any = { revokedAt: null };
    if (centerId) assignWhere.centerId = centerId;
    else if (scopeCenterIds) assignWhere.centerId = { in: scopeCenterIds };
    if (dto.academicYearId) assignWhere.academicYearId = dto.academicYearId;

    const where: any = { isActive: true, userType: { not: 'STUDENT' } };
    if (centerId || scopeCenterIds) where.centerAssignments = { some: assignWhere };

    const users = await this.prisma.user.findMany({
      where,
      include: {
        district: { select: { id: true, label: true } },
        jobPosition: { select: { id: true, label: true } },
        employmentType: { select: { id: true, label: true } },
        maritalStatus: { select: { id: true, label: true } },
        centerAssignments: { where: { revokedAt: null }, include: { center: { select: { id: true, name: true } } } },
        disabilities: { include: { disabilityType: { select: { id: true, label: true } } } },
      },
    });

    const total = users.length;
    const rows  = this.groupBy(users, dto.dimensions, total);
    return { entity: 'USER', dimensions: dto.dimensions, total, rows, generatedAt: new Date().toISOString() };
  }

  // ─── CENTERS query ────────────────────────────────────────
  private async queryCenters(dto: AnalyticsQueryDto): Promise<AnalyticsResult> {
    const centers = await this.prisma.center.findMany({
      where: { isActive: true },
      include: {
        district: { select: { id: true, label: true } },
        centerType: { select: { id: true, label: true } },
      },
    });
    const total = centers.length;
    const rows  = this.groupBy(centers, dto.dimensions, total);
    return { entity: 'CENTER', dimensions: dto.dimensions, total, rows, generatedAt: new Date().toISOString() };
  }

  // ─── groupBy engine ───────────────────────────────────────
  private groupBy(records: any[], dimensions: AnalyticsDimension[], total: number): AnalyticsRow[] {
    if (!dimensions.length) return [];
    const [dim, ...rest] = dimensions;
    const groups = new Map<string, { label: string; items: any[] }>();

    for (const rec of records) {
      for (const { key, label } of this.extractKeys(rec, dim)) {
        if (!groups.has(key)) groups.set(key, { label, items: [] });
        groups.get(key)!.items.push(rec);
      }
    }

    const rows: AnalyticsRow[] = [];
    for (const [key, { label, items }] of groups) {
      const count = items.length;
      const row: AnalyticsRow = {
        key, label, count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      };
      if (rest.length) row.children = this.groupBy(items, rest, count);
      rows.push(row);
    }
    return rows.sort((a, b) => b.count - a.count);
  }

  private extractKeys(rec: any, dim: AnalyticsDimension): { key: string; label: string }[] {
    switch (dim) {
      case AnalyticsDimension.DISTRICT:
        return [{ key: String(rec.district?.id ?? 'none'), label: rec.district?.label ?? 'نامشخص' }];
      case AnalyticsDimension.CENTER:
        if (rec.center) return [{ key: String(rec.center.id), label: rec.center.name }];
        if (rec.centerAssignments?.length)
          return rec.centerAssignments.map((a: any) => ({ key: String(a.center.id), label: a.center.name }));
        return [{ key: 'none', label: 'بدون مرکز' }];
      case AnalyticsDimension.EDUCATION_LEVEL:
        return [{ key: String(rec.educationLevel?.id ?? 'none'), label: rec.educationLevel?.label ?? 'نامشخص' }];
      case AnalyticsDimension.GRADE:
        return [{ key: String(rec.grade?.id ?? 'none'), label: rec.grade?.label ?? 'نامشخص' }];
      case AnalyticsDimension.DISABILITY_TYPE:
        if (!rec.disabilities?.length) return [{ key: 'none', label: 'بدون معلولیت ثبت‌شده' }];
        return rec.disabilities.map((d: any) => ({ key: String(d.disabilityType?.id ?? 'none'), label: d.disabilityType?.label ?? 'نامشخص' }));
      case AnalyticsDimension.GENDER:
        return [{ key: rec.gender, label: rec.gender === 'MALE' ? 'پسر/مرد' : 'دختر/زن' }];
      case AnalyticsDimension.ATTENDANCE_TYPE:
        return [{ key: rec.attendanceType ?? 'none', label: this.attendanceLabel(rec.attendanceType) }];
      case AnalyticsDimension.USER_TYPE:
        return [{ key: rec.userType, label: this.userTypeLabel(rec.userType) }];
      case AnalyticsDimension.JOB_POSITION:
        return [{ key: String(rec.jobPosition?.id ?? 'none'), label: rec.jobPosition?.label ?? 'نامشخص' }];
      case AnalyticsDimension.EMPLOYMENT_TYPE:
        return [{ key: String(rec.employmentType?.id ?? 'none'), label: rec.employmentType?.label ?? 'نامشخص' }];
      case AnalyticsDimension.MARITAL_STATUS:
        return [{ key: String(rec.maritalStatus?.id ?? 'none'), label: rec.maritalStatus?.label ?? 'نامشخص' }];
      case AnalyticsDimension.IS_MULTIPLE_DISABILITY:
        const m = (rec.disabilities?.length ?? 0) > 1;
        return [{ key: m ? 'yes' : 'no', label: m ? 'چندمعلولیتی' : 'تک‌معلولیتی' }];
      case AnalyticsDimension.CENTER_TYPE:
        return [{ key: String(rec.centerType?.id ?? 'none'), label: rec.centerType?.label ?? 'نامشخص' }];
      default:
        return [{ key: 'unknown', label: 'نامشخص' }];
    }
  }

  private attendanceLabel(t?: string) {
    return { SCHOOL_PRESENCE: 'حضوری', HOME_BASED: 'خانه‌محور', DAY_CARE: 'روزانه' }[t ?? ''] ?? t ?? 'نامشخص';
  }
  private userTypeLabel(t: string) {
    return { SUPERUSER: 'سوپریوزر', CENTER_MANAGER: 'مدیر مرکز', TEACHER: 'معلم', STAFF: 'کارمند' }[t] ?? t;
  }
}

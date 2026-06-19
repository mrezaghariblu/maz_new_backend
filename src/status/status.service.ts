// src/status/status.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStatusTypeDto,
  RecordStatusDto,
  StatusTarget,
} from './dto/status.dto';

@Injectable()
export class StatusService {
  constructor(private prisma: PrismaService) {}

  // ─── انواع وضعیت ──────────────────────────────────────────

  async getStatusTypes(target: StatusTarget) {
    switch (target) {
      case StatusTarget.PERSONNEL:
        return this.prisma.personnelStatusType.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        });
      case StatusTarget.STUDENT:
        return this.prisma.studentStatusType.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        });
      case StatusTarget.CENTER:
        return this.prisma.centerStatusType.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        });
    }
  }

  async createStatusType(dto: CreateStatusTypeDto) {
    switch (dto.target) {
      case StatusTarget.PERSONNEL:
        return this.prisma.personnelStatusType.create({
          data: {
            code: dto.code,
            label: dto.label,
            description: dto.description,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
      case StatusTarget.STUDENT:
        return this.prisma.studentStatusType.create({
          data: {
            code: dto.code,
            label: dto.label,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
      case StatusTarget.CENTER:
        return this.prisma.centerStatusType.create({
          data: {
            code: dto.code,
            label: dto.label,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
    }
  }

  // ─── ثبت تغییر وضعیت ─────────────────────────────────────

  async recordPersonnelStatus(dto: RecordStatusDto) {
    // پایان دادن به وضعیت قبلی (اگر باز بود)
    await this.prisma.personnelStatusHistory.updateMany({
      where: {
        userId: dto.entityId,
        academicYearId: dto.academicYearId,
        endDate: null,
      },
      data: { endDate: new Date(dto.effectiveDate) },
    });

    return this.prisma.personnelStatusHistory.create({
      data: {
        userId: dto.entityId,
        statusTypeId: dto.statusTypeId,
        academicYearId: dto.academicYearId,
        effectiveDate: new Date(dto.effectiveDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        note: dto.note,
      },
      include: { statusType: true, academicYear: { select: { label: true } } },
    });
  }

  async recordStudentStatus(dto: RecordStatusDto) {
    await this.prisma.studentStatusHistory.updateMany({
      where: {
        studentId: dto.entityId,
        academicYearId: dto.academicYearId,
        endDate: null,
      },
      data: { endDate: new Date(dto.effectiveDate) },
    });

    return this.prisma.studentStatusHistory.create({
      data: {
        studentId: dto.entityId,
        statusTypeId: dto.statusTypeId,
        academicYearId: dto.academicYearId,
        effectiveDate: new Date(dto.effectiveDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        note: dto.note,
      },
      include: { statusType: true },
    });
  }

  async recordCenterStatus(dto: RecordStatusDto) {
    await this.prisma.centerStatusHistory.updateMany({
      where: {
        centerId: dto.entityId,
        academicYearId: dto.academicYearId,
        endDate: null,
      },
      data: { endDate: new Date(dto.effectiveDate) },
    });

    return this.prisma.centerStatusHistory.create({
      data: {
        centerId: dto.entityId,
        statusTypeId: dto.statusTypeId,
        academicYearId: dto.academicYearId,
        effectiveDate: new Date(dto.effectiveDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        note: dto.note,
      },
      include: { statusType: true },
    });
  }

  // ─── تاریخچه ──────────────────────────────────────────────

  async getPersonnelHistory(userId: number, academicYearId?: number) {
    return this.prisma.personnelStatusHistory.findMany({
      where: { userId, ...(academicYearId && { academicYearId }) },
      orderBy: { effectiveDate: 'desc' },
      include: {
        statusType: true,
        academicYear: { select: { id: true, label: true } },
      },
    });
  }

  async getStudentHistory(studentId: number, academicYearId?: number) {
    return this.prisma.studentStatusHistory.findMany({
      where: { studentId, ...(academicYearId && { academicYearId }) },
      orderBy: { effectiveDate: 'desc' },
      include: {
        statusType: true,
        academicYear: { select: { id: true, label: true } },
      },
    });
  }

  async getCenterHistory(centerId: number, academicYearId?: number) {
    return this.prisma.centerStatusHistory.findMany({
      where: { centerId, ...(academicYearId && { academicYearId }) },
      orderBy: { effectiveDate: 'desc' },
      include: {
        statusType: true,
        academicYear: { select: { id: true, label: true } },
      },
    });
  }

  // ─── حذف رکورد وضعیت ─────────────────────────────────────

  async deletePersonnelStatusRecord(id: number) {
    const rec = await this.prisma.personnelStatusHistory.findUnique({
      where: { id },
    });
    if (!rec) throw new NotFoundException('رکورد یافت نشد');
    return this.prisma.personnelStatusHistory.delete({ where: { id } });
  }
}

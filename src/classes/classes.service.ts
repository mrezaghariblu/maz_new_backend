// src/classes/classes.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { UserType } from '@prisma/client';
import {
  AssignTeacherDto,
  CreateClassRoomDto,
  SetClassGradesDto,
  UpdateClassRoomDto,
} from './dto/class.dto';

const CLASS_ROOM_INCLUDE = {
  center: { select: { id: true, name: true, city: true } },
  academicYear: { select: { id: true, label: true } },
  classGrades: { include: { grade: { include: { educationLevel: true } } } },
  teacherAssignments: {
    where: { revokedAt: null },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, userType: true } },
      subject: true,
    },
  },
} as const;

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  private assertCenterScope(requester: JwtPayload, centerId: number) {
    if (requester.type === UserType.SUPERUSER) return;
    if (!requester.centerIds?.includes(centerId)) {
      throw new ForbiddenException('شما فقط به کلاس‌های مرکز خودتان دسترسی دارید');
    }
  }

  async findAll(requester: JwtPayload, centerId?: number, academicYearId?: number) {
    if (centerId) this.assertCenterScope(requester, centerId);

    const scopeWhere =
      requester.type === UserType.SUPERUSER
        ? {}
        : { centerId: { in: requester.centerIds ?? [] } };

    const rows = await this.prisma.classRoom.findMany({
      where: {
        ...scopeWhere,
        ...(centerId ? { centerId } : {}),
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: CLASS_ROOM_INCLUDE,
      orderBy: { name: 'asc' },
    });

    return rows.map((r) => this.withComputedType(r));
  }

  async findOne(id: number, requester: JwtPayload) {
    const row = await this.prisma.classRoom.findUnique({
      where: { id },
      include: CLASS_ROOM_INCLUDE,
    });
    if (!row) throw new NotFoundException('کلاس یافت نشد');
    this.assertCenterScope(requester, row.centerId);
    return this.withComputedType(row);
  }

  async create(dto: CreateClassRoomDto, requester: JwtPayload) {
    this.assertCenterScope(requester, dto.centerId);

    const grades = await this.prisma.grade.findMany({ where: { id: { in: dto.gradeIds } } });
    if (grades.length !== dto.gradeIds.length) {
      throw new BadRequestException('یک یا چند پایه‌ی انتخاب‌شده معتبر نیست');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const room = await tx.classRoom.create({
        data: { centerId: dto.centerId, academicYearId: dto.academicYearId, name: dto.name },
      });
      await tx.classGrade.createMany({
        data: dto.gradeIds.map((gradeId) => ({ classRoomId: room.id, gradeId })),
      });
      return room;
    });

    return this.findOne(created.id, requester);
  }

  async update(id: number, dto: UpdateClassRoomDto, requester: JwtPayload) {
    const row = await this.findOne(id, requester);
    return this.prisma.classRoom.update({ where: { id: row.id }, data: dto });
  }

  async deactivate(id: number, requester: JwtPayload) {
    const row = await this.findOne(id, requester);
    return this.prisma.classRoom.update({ where: { id: row.id }, data: { isActive: false } });
  }

  // جایگزینی کامل لیست پایه‌های یک کلاس (چندپایه)
  async setGrades(id: number, dto: SetClassGradesDto, requester: JwtPayload) {
    const row = await this.findOne(id, requester);

    const grades = await this.prisma.grade.findMany({ where: { id: { in: dto.gradeIds } } });
    if (grades.length !== dto.gradeIds.length) {
      throw new BadRequestException('یک یا چند پایه‌ی انتخاب‌شده معتبر نیست');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.classGrade.deleteMany({ where: { classRoomId: row.id } });
      await tx.classGrade.createMany({
        data: dto.gradeIds.map((gradeId) => ({ classRoomId: row.id, gradeId })),
      });
    });

    return this.findOne(id, requester);
  }

  // ─── تخصیص آموزگار/دبیر ────────────────────────────────────
  async assignTeacher(classRoomId: number, dto: AssignTeacherDto, requester: JwtPayload) {
    const row = await this.findOne(classRoomId, requester);

    if (dto.subjectId) {
      const subject = await this.prisma.lookupValue.findFirst({
        where: { id: dto.subjectId, groupKey: 'SUBJECT', isActive: true },
      });
      if (!subject) throw new BadRequestException('درس انتخاب‌شده معتبر نیست');
    }

    const dup = await this.prisma.classTeacherAssignment.findFirst({
      where: {
        classRoomId: row.id,
        userId: dto.userId,
        academicYearId: dto.academicYearId,
        subjectId: dto.subjectId ?? null,
        revokedAt: null,
      },
    });
    if (dup) throw new ConflictException('این پرسنل قبلاً با همین درس به این کلاس تخصیص یافته');

    return this.prisma.classTeacherAssignment.create({
      data: {
        classRoomId: row.id,
        userId: dto.userId,
        academicYearId: dto.academicYearId,
        subjectId: dto.subjectId,
      },
    });
  }

  async revokeTeacherAssignment(assignmentId: number, requester: JwtPayload) {
    const assignment = await this.prisma.classTeacherAssignment.findUnique({
      where: { id: assignmentId },
      include: { classRoom: true },
    });
    if (!assignment) throw new NotFoundException('تخصیص یافت نشد');
    this.assertCenterScope(requester, assignment.classRoom.centerId);
    if (assignment.revokedAt) throw new BadRequestException('این تخصیص قبلاً لغو شده');

    return this.prisma.classTeacherAssignment.update({
      where: { id: assignmentId },
      data: { revokedAt: new Date() },
    });
  }

  // ─── نوع کلاس (محاسبه‌شده) ──────────────────────────────────
  // gradeComposition همین حالا قابل‌محاسبه‌ست. disabilityComposition
  // به دانش‌آموزانِ کلاس وابسته‌ست که فردا وصل می‌شه — فعلاً null.
  private withComputedType<T extends { classGrades: unknown[] }>(row: T) {
    const gradeCount = row.classGrades.length;
    return {
      ...row,
      computedType: {
        gradeComposition: gradeCount > 1 ? 'MULTI_GRADE' : 'SINGLE_GRADE',
        disabilityComposition: null as 'SINGLE_DISABILITY' | 'MULTI_DISABILITY' | null,
      },
    };
  }
}

// src/students/students.service.ts
import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilterBuilderService } from '../common/filters/filter-builder.service';
import { ExcelExportService } from '../common/excel/excel-export.service';
import { DisabilityService } from '../common/disability/disability.service';
import { SmartFilterDto, ExcelExportDto } from '../common/filters/smart-filter.dto';
import { JwtPayload } from '../auth/auth.service';
import { UserType } from '@prisma/client';
import { Response } from 'express';
import {
  CreateStudentDto, UpdateStudentDto, SetAssistiveDevicesDto,
  AssignToClassDto, PromotionDecisionDto,
} from './dto/student.dto';
import { AssignDisabilityDto } from '../users/dto/user.dto';

const TRACK_DISABILITY_CODES: Record<string, string[]> = {
  INTELLECTUAL_AUTISM: ['INTELLECTUAL', 'AUTISM'],
  SENSORY_MOTOR:       ['PHYSICAL_MOTOR', 'VISUAL', 'HEARING'],
};

const STUDENT_INCLUDE = {
  educationLevel: true,
  grade: { include: { educationLevel: true } },
  fieldOfStudy: true,
  center: { select: { id: true, name: true, city: true } },
  district: true,
  physicalStatus: true,
  bookType: true,
  speechDisorder: true,
  guardianPhysicalStatus: true,
  secondGuardianPhysicalStatus: true,
  disabilities: { include: { disabilityType: true } },
  assistiveDevices: { include: { assistiveDevice: true } },
  classAssignments: {
    where: { revokedAt: null },
    include: {
      classRoom: { select: { id: true, name: true } },
      grade: true,
      academicYear: { select: { id: true, label: true } },
    },
  },
  studentStatusHistory: {
    orderBy: { effectiveDate: 'desc' as const },
    take: 1,
    include: { statusType: true },
  },
} as const;

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private filterBuilder: FilterBuilderService,
    private excelExport: ExcelExportService,
    private disabilityService: DisabilityService,
  ) {}

  async findAll(dto: SmartFilterDto, requester: JwtPayload) {
    const { where, orderBy, skip, take } = this.filterBuilder.build(dto);

    const scopeWhere =
      requester.type === UserType.SUPERUSER
        ? where
        : { AND: [where, { centerId: { in: requester.centerIds } }] };

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where: scopeWhere as any,
        orderBy: orderBy ?? [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip, take,
        include: {
          ...STUDENT_INCLUDE,
          classAssignments: {
            where: { revokedAt: null },
            include: {
              classRoom: {
                select: {
                  id: true, name: true,
                  teacherAssignments: {
                    where: { revokedAt: null },
                    take: 1,
                    include: { user: { select: { id: true, firstName: true, lastName: true } } },
                  },
                },
              },
              grade: true,
              academicYear: { select: { id: true, label: true } },
            },
          },
        },
      }),
      this.prisma.student.count({ where: scopeWhere as any }),
    ]);

    const shaped = data.map(s => this.withComputed(s));
    return { data: shaped, total, page: dto.page ?? 1, pageSize: take, pageCount: Math.ceil(total / take) };
  }

  async findOne(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        ...STUDENT_INCLUDE,
        classAssignments: {
          orderBy: { enrolledAt: 'desc' },
          include: {
            classRoom: {
              select: {
                id: true, name: true,
                teacherAssignments: {
                  where: { revokedAt: null },
                  include: { user: { select: { id: true, firstName: true, lastName: true } }, subject: true },
                },
              },
            },
            grade: true,
            academicYear: { select: { id: true, label: true } },
          },
        },
        studentStatusHistory: {
          orderBy: { effectiveDate: 'desc' },
          include: { statusType: true, academicYear: { select: { id: true, label: true } } },
        },
      },
    });
    if (!student) throw new NotFoundException('دانش‌آموز یافت نشد');
    return this.withComputed(student);
  }

  async create(dto: CreateStudentDto, requester: JwtPayload) {
    if (requester.type === UserType.CENTER_MANAGER) {
      if (!dto.centerId || !requester.centerIds?.includes(dto.centerId)) {
        throw new ForbiddenException('شما فقط می‌توانید برای مدرسه‌ی خودتان دانش‌آموز ثبت کنید');
      }
    }

    const exists = await this.prisma.student.findUnique({ where: { nationalCode: dto.nationalCode } });
    if (exists) throw new ConflictException(`کد ملی "${dto.nationalCode}" قبلاً ثبت شده`);

    const { disabilities, assistiveDeviceIds, ...data } = dto;

    const student = await this.prisma.student.create({ data: data as any });

    if (disabilities?.length) {
      await this.disabilityService.setForStudent(student.id, disabilities);
    }
    if (assistiveDeviceIds?.length) {
      await this.setAssistiveDevices(student.id, { ids: assistiveDeviceIds });
    }

    return this.findOne(student.id);
  }

  async update(id: number, dto: UpdateStudentDto) {
    const existing = await this.findOne(id);

    // اگر کد ملی تغییر کرده، بررسی تکراری نبودن
    if (dto.nationalCode && dto.nationalCode !== existing.nationalCode) {
      const dup = await this.prisma.student.findFirst({
        where: { nationalCode: dto.nationalCode, NOT: { id } },
      });
      if (dup) throw new ConflictException(`کد ملی "${dto.nationalCode}" قبلاً ثبت شده`);
    }

    const { ...data } = dto;
    return this.prisma.student.update({ where: { id }, data: data as any });
  }

  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.student.update({ where: { id }, data: { isActive: false } });
  }

  async setDisabilities(studentId: number, items: AssignDisabilityDto[]) {
    await this.findOne(studentId);
    const rows = await this.disabilityService.setForStudent(studentId, items);
    return { items: rows, isMultiple: this.disabilityService.isMultiple(rows.length) };
  }

  async setAssistiveDevices(studentId: number, dto: SetAssistiveDevicesDto) {
    const devices = await this.prisma.lookupValue.findMany({
      where: { id: { in: dto.ids }, groupKey: 'ASSISTIVE_DEVICE', isActive: true },
    });
    if (devices.length !== dto.ids.length) {
      throw new BadRequestException('یک یا چند وسیله‌ی کمکی معتبر نیست');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.studentAssistiveDevice.deleteMany({ where: { studentId } });
      if (dto.ids.length) {
        await tx.studentAssistiveDevice.createMany({
          data: dto.ids.map(id => ({ studentId, assistiveDeviceId: id })),
        });
      }
      return tx.studentAssistiveDevice.findMany({
        where: { studentId },
        include: { assistiveDevice: true },
      });
    });
  }

  async assignToClass(studentId: number, dto: AssignToClassDto, requester: JwtPayload) {
    const student = await this.findOne(studentId);

    const classRoom = await this.prisma.classRoom.findUnique({
      where: { id: dto.classRoomId },
      include: { classGrades: { include: { grade: true } } },
    });
    if (!classRoom) throw new NotFoundException('کلاس یافت نشد');

    if (requester.type === UserType.CENTER_MANAGER) {
      if (!requester.centerIds?.includes(classRoom.centerId)) {
        throw new ForbiddenException('این کلاس متعلق به مرکز شما نیست');
      }
    }

    const gradeInClass = classRoom.classGrades.find(cg => cg.gradeId === dto.gradeId);
    if (!gradeInClass) throw new BadRequestException('این پایه در کلاس انتخابی وجود ندارد');

    const warnings: string[] = [];
    const gradeTrack = gradeInClass.grade.track;
    if (gradeTrack !== 'NORMAL') {
      const requiredCodes = TRACK_DISABILITY_CODES[gradeTrack] ?? [];
      const studentDisabilityCodes = (student.disabilities ?? [])
        .map((d: any) => d.disabilityType?.code)
        .filter(Boolean);
      const hasMatch = requiredCodes.some(code => studentDisabilityCodes.includes(code));
      if (!hasMatch) {
        warnings.push(
          `هشدار: پایه‌ی «${gradeInClass.grade.label}» مخصوص دانش‌آموزان ` +
          `${gradeTrack === 'INTELLECTUAL_AUTISM' ? 'کم‌توان ذهنی و اتیسم' : 'گروه حسی-حرکتی'} است ` +
          `ولی این نوع معلولیت در پرونده‌ی دانش‌آموز ثبت نشده.`
        );
      }
    }

    const dup = await this.prisma.studentClassAssignment.findFirst({
      where: { studentId, academicYearId: dto.academicYearId, revokedAt: null },
    });
    if (dup) throw new ConflictException('این دانش‌آموز قبلاً در این سال تحصیلی به یک کلاس تخصیص یافته');

    const assignment = await this.prisma.studentClassAssignment.create({
      data: { studentId, classRoomId: dto.classRoomId, gradeId: dto.gradeId, academicYearId: dto.academicYearId },
    });

    return { assignment, warnings };
  }

  async revokeClassAssignment(assignmentId: number) {
    const a = await this.prisma.studentClassAssignment.findUnique({ where: { id: assignmentId } });
    if (!a) throw new NotFoundException('تخصیص یافت نشد');
    if (a.revokedAt) throw new BadRequestException('این تخصیص قبلاً لغو شده');
    return this.prisma.studentClassAssignment.update({
      where: { id: assignmentId },
      data: { revokedAt: new Date() },
    });
  }

  async recordPromotion(studentId: number, dto: PromotionDecisionDto, requester: JwtPayload) {
    await this.findOne(studentId);
    const dup = await this.prisma.studentPromotionDecision.findUnique({
      where: { studentId_academicYearId: { studentId, academicYearId: dto.academicYearId } },
    });
    if (dup) throw new ConflictException('برای این سال تحصیلی قبلاً تصمیم ارتقا ثبت شده');

    return this.prisma.studentPromotionDecision.create({
      data: {
        studentId,
        academicYearId: dto.academicYearId,
        decision: dto.decision,
        nextGradeId: dto.nextGradeId,
        decisionById: requester.sub,
        note: dto.note,
      },
      include: { academicYear: true, nextGrade: true, decisionBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  // ─── آمار دانش‌آموزان کلاسبندی‌نشده (برای داشبورد) ──────
  async getUnassignedCount(centerId: number, academicYearId: number): Promise<number> {
    return this.prisma.student.count({
      where: {
        centerId,
        isActive: true,
        classAssignments: {
          none: { academicYearId, revokedAt: null },
        },
      },
    });
  }

  async exportExcel(dto: ExcelExportDto, requester: JwtPayload, res: Response) {
    const result = await this.findAll({ ...dto, page: 1, pageSize: 10000 }, requester);
    const flat = (result.data as any[]).map((s) => ({
      ...s,
      fullName: `${s.firstName} ${s.lastName}`,
      genderLabel: s.gender === 'MALE' ? 'پسر' : 'دختر',
      isActiveLabel: s.isActive ? 'فعال' : 'غیرفعال',
      educationLevelLabel: s.educationLevel?.label ?? '—',
      gradeLabel: s.grade?.label ?? '—',
      centerName: s.center?.name ?? '—',
      districtLabel: s.district?.label ?? '—',
      currentStatus: s.studentStatusHistory?.[0]?.statusType?.label ?? '—',
      disabilityLabels: (s.disabilities ?? []).map((d: any) => d.disabilityType?.label).filter(Boolean).join('، ') || '—',
      isMultipleDisabilityLabel: s.isMultipleDisability ? 'بله' : 'خیر',
      birthShamsi:
        s.birthYearShamsi && s.birthMonth && s.birthDay
          ? `${s.birthYearShamsi}/${String(s.birthMonth).padStart(2, '0')}/${String(s.birthDay).padStart(2, '0')}`
          : '—',
    }));
    await this.excelExport.export({ data: flat, columns: dto.columns, sheetName: dto.sheetName, filename: dto.filename ?? 'students', res });
  }

  private withComputed(s: any) {
    const disabilityCount = s.disabilities?.length ?? 0;
    const now = new Date();
    let age: number | null = null;
    if (s.birthYearShamsi) {
      // تبدیل تقریبی: سال شمسی به میلادی (سال شمسی + 621)
      const birthYear = s.birthYearShamsi + 621;
      age = now.getFullYear() - birthYear;
    }
    return { ...s, isMultipleDisability: disabilityCount > 1, age };
  }
}

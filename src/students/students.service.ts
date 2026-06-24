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

// کدهای معلولیت مرتبط با هر track پایه
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

  // ─── List ──────────────────────────────────────────────────
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
          // معلم و کلاس (برای ابتدایی و پیش‌دبستانی)
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

    return {
      data: data.map(s => this.withComputed(s)),
      total,
      page: dto.page ?? 1,
      pageSize: take,
      pageCount: Math.ceil(total / take),
    };
  }

  // ─── Single ────────────────────────────────────────────────
  async findOne(id: number) {
    const s = await this.prisma.student.findUnique({
      where: { id },
      include: {
        ...STUDENT_INCLUDE,
        studentStatusHistory: {
          orderBy: { effectiveDate: 'desc' },
          include: { statusType: true, academicYear: { select: { id: true, label: true } } },
        },
      },
    });
    if (!s) throw new NotFoundException('دانش‌آموز یافت نشد');
    return this.withComputed(s);
  }

  // ─── Create ────────────────────────────────────────────────
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

  // ─── Update ────────────────────────────────────────────────
  async update(id: number, dto: UpdateStudentDto) {
    await this.findOne(id);
    const { ...data } = dto;
    return this.prisma.student.update({ where: { id }, data: data as any });
  }

  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.student.update({ where: { id }, data: { isActive: false } });
  }

  // ─── معلولیت‌ها ────────────────────────────────────────────
  async setDisabilities(studentId: number, items: AssignDisabilityDto[]) {
    await this.findOne(studentId);
    const rows = await this.disabilityService.setForStudent(studentId, items);
    return { items: rows, isMultiple: this.disabilityService.isMultiple(rows.length) };
  }

  // ─── وسایل کمکی ───────────────────────────────────────────
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

  // ─── تخصیص به کلاس ────────────────────────────────────────
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

    // بررسی اینکه پایه‌ی انتخابی توی این کلاس هست
    const gradeInClass = classRoom.classGrades.find(cg => cg.gradeId === dto.gradeId);
    if (!gradeInClass) throw new BadRequestException('این پایه در کلاس انتخابی وجود ندارد');

    // هشدار track: اگه پایه track خاص داره ولی دانش‌آموز معلولیت منطبق نداره
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
      data: {
        studentId,
        classRoomId: dto.classRoomId,
        gradeId: dto.gradeId,
        academicYearId: dto.academicYearId,
      },
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

  // ─── تصمیم ارتقا ──────────────────────────────────────────
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

  // ─── Excel export ──────────────────────────────────────────
  async exportExcel(dto: ExcelExportDto, requester: JwtPayload, res: Response) {
    const result = await this.findAll({ ...dto, page: 1, pageSize: 10000 }, requester);
    const flat = (result.data as any[]).map(s => ({
      ...s,
      fullName: `${s.firstName} ${s.lastName}`,
      age: s.age ?? '—',
      genderLabel: s.gender === 'MALE' ? 'پسر' : 'دختر',
      educationLevelLabel: s.educationLevel?.label ?? '—',
      gradeLabel: s.grade?.label ?? '—',
      centerName: s.center?.name ?? '—',
      districtLabel: s.district?.label ?? '—',
      currentStatus: s.studentStatusHistory[0]?.statusType?.label ?? '—',
      disabilityLabels: (s.disabilities ?? []).map((d: any) => d.disabilityType?.label).join('، ') || '—',
      isMultipleDisabilityLabel: s.isMultipleDisability ? 'بله' : 'خیر',
      birthShamsi: s.birthYearShamsi && s.birthMonth && s.birthDay
        ? `${s.birthYearShamsi}/${String(s.birthMonth).padStart(2,'0')}/${String(s.birthDay).padStart(2,'0')}`
        : '—',
      currentTeacher: s.classAssignments?.[0]?.classRoom?.teacherAssignments?.[0]?.user
        ? `${s.classAssignments[0].classRoom.teacherAssignments[0].user.firstName} ${s.classAssignments[0].classRoom.teacherAssignments[0].user.lastName}`
        : '—',
      currentClassName: s.classAssignments?.[0]?.classRoom?.name ?? '—',
    }));
    await this.excelExport.export({
      data: flat, columns: dto.columns, sheetName: dto.sheetName,
      filename: dto.filename ?? 'students', res,
    });
  }

  // ─── محاسبات خودکار ───────────────────────────────────────
  private withComputed(s: any) {
    const count = s.disabilities?.length ?? 0;
    const age = this.calcAge(s.birthYearShamsi, s.birthMonth, s.birthDay);
    return {
      ...s,
      age,
      isMultipleDisability: this.disabilityService.isMultiple(count),
    };
  }

  // محاسبه‌ی سن تقریبی از تاریخ شمسی (بدون نیاز به کتابخانه)
  private calcAge(year?: number, month?: number, day?: number): number | null {
    if (!year) return null;
    // تبدیل تقریبی: هر سال شمسی ≈ 365.25 روز، مبدأ شمسی = 1348/10/11 میلادی
    const shamsiEpoch = 621.5; // آفست تقریبی سال
    const nowGregorian = new Date();
    const nowYear = nowGregorian.getFullYear() + nowGregorian.getMonth() / 12;
    const birthGregorian = (year + (month ?? 1) / 12) + shamsiEpoch;
    return Math.floor(nowYear - birthGregorian + shamsiEpoch - shamsiEpoch);
  }
}

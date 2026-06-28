// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilterBuilderService } from '../common/filters/filter-builder.service';
import { ExcelExportService } from '../common/excel/excel-export.service';
import { DisabilityService } from '../common/disability/disability.service';
import { SmartFilterDto, ExcelExportDto } from '../common/filters/smart-filter.dto';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  AssignCenterDto,
  TransferDto,
  SetDisabilitiesDto,
  SetCanLoginDto,
} from './dto/user.dto';
import { JwtPayload } from '../auth/auth.service';
import { Prisma, UserType } from '@prisma/client';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';

const PERSONNEL_RELATIONS_SELECT = {
  id: true,
  nationalCode: true,
  personnelCode: true,
  firstName: true,
  lastName: true,
  fatherName: true,
  gender: true,
  userType: true,
  phone: true,
  email: true,
  birthDate: true,
  birthDay: true,
  birthMonth: true,
  birthYearShamsi: true,
  requiredHours: true,
  nonRequiredHours: true,
  exceptionalEntryDay: true,
  exceptionalEntryMonth: true,
  exceptionalEntryYear: true,
  serviceRecordYears: true,
  serviceRecordMonths: true,
  serviceRecordDays: true,
  fieldOfStudy: true,
  isargariStatus: true,
  address: true,
  bankAccountNumber: true,
  shadMobileNumber: true,
  shadUsername: true,
  willingJudgeCultural: true,
  willingJudgeQuranEtrat: true,
  willingJudgeSports: true,
  judgeCertificateField: true,
  isActive: true,
  canLogin: true,
  createdAt: true,
  district: true,
  employmentType: true,
  jobPosition: true,
  educationDegree: true,
  maritalStatus: true,
  employmentCategory: true,
  physicalStatus: true,
  disabilities: { include: { disabilityType: true } },
  centerAssignments: {
    where: { revokedAt: null },
    include: {
      center: { select: { id: true, name: true, city: true } },
      academicYear: { select: { id: true, label: true } },
    },
  },
  personnelStatusHistory: {
    orderBy: { effectiveDate: 'desc' as const },
    take: 1,
    include: { statusType: { select: { label: true, code: true } } },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private filterBuilder: FilterBuilderService,
    private excelExport: ExcelExportService,
    private disabilityService: DisabilityService,
  ) {}

  async findAll(dto: SmartFilterDto, requester: JwtPayload) {
    const { where, skip, take } = this.filterBuilder.build(dto);

    const scopeWhere =
      requester.type === UserType.SUPERUSER
        ? where
        : {
            AND: [
              where,
              { centerAssignments: { some: { centerId: { in: requester.centerIds }, revokedAt: null } } },
            ],
          };

    const orderBy: Prisma.UserOrderByWithRelationInput[] = dto.sort
      ? [{ [dto.sort.field]: dto.sort.direction } as Prisma.UserOrderByWithRelationInput]
      : [{ jobPosition: { sortOrder: 'asc' } }, { lastName: 'asc' }];

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: scopeWhere as Prisma.UserWhereInput,
        orderBy,
        skip,
        take,
        select: PERSONNEL_RELATIONS_SELECT,
      }),
      this.prisma.user.count({ where: scopeWhere as Prisma.UserWhereInput }),
    ]);

    const shaped = data.map((u) => this.withMultipleDisabilityTag(u));
    return { data: shaped, total, page: dto.page ?? 1, pageSize: take, pageCount: Math.ceil(total / take) };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        district: true,
        employmentType: true,
        jobPosition: true,
        educationDegree: true,
        maritalStatus: true,
        employmentCategory: true,
        physicalStatus: true,
        disabilities: { include: { disabilityType: true } },
        centerAssignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            center: { select: { id: true, name: true, city: true } },
            academicYear: { select: { id: true, label: true } },
          },
        },
        personnelStatusHistory: {
          orderBy: { effectiveDate: 'desc' },
          include: { statusType: true, academicYear: { select: { id: true, label: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    return this.withMultipleDisabilityTag(user);
  }

  async create(dto: CreateUserDto, requester: JwtPayload) {
    const exists = await this.prisma.user.findUnique({ where: { nationalCode: dto.nationalCode } });
    if (exists) throw new ConflictException(`کد ملی "${dto.nationalCode}" قبلاً ثبت شده`);

    if (dto.personnelCode) {
      const dupCode = await this.prisma.user.findUnique({ where: { personnelCode: dto.personnelCode } });
      if (dupCode) throw new ConflictException(`کد پرسنلی "${dto.personnelCode}" قبلاً ثبت شده`);
    }

    if (requester.type === UserType.CENTER_MANAGER) {
      if (!dto.centerId || !requester.centerIds?.includes(dto.centerId)) {
        throw new ForbiddenException('شما فقط می‌توانید برای مرکز خودتان پرسنل ثبت کنید');
      }
    }

    if (dto.centerId && !dto.academicYearId) {
      throw new BadRequestException('برای تخصیص به مرکز، سال تحصیلی الزامی است');
    }

    const canLogin = ([UserType.SUPERUSER, UserType.CENTER_MANAGER] as UserType[]).includes(dto.userType);
    const passwordHash = dto.password && canLogin ? await bcrypt.hash(dto.password, 10) : null;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          nationalCode: dto.nationalCode,
          personnelCode: dto.personnelCode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          fatherName: dto.fatherName,
          gender: dto.gender,
          userType: dto.userType,
          phone: dto.phone,
          email: dto.email,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          birthDay: dto.birthDay,
          birthMonth: dto.birthMonth,
          birthYearShamsi: dto.birthYearShamsi,
          employmentTypeId: dto.employmentTypeId,
          jobPositionId: dto.jobPositionId,
          employmentCategoryId: dto.employmentCategoryId,
          requiredHours: dto.requiredHours,
          nonRequiredHours: dto.nonRequiredHours,
          exceptionalEntryDay: dto.exceptionalEntryDay,
          exceptionalEntryMonth: dto.exceptionalEntryMonth,
          exceptionalEntryYear: dto.exceptionalEntryYear,
          serviceRecordYears: dto.serviceRecordYears,
          serviceRecordMonths: dto.serviceRecordMonths,
          serviceRecordDays: dto.serviceRecordDays,
          maritalStatusId: dto.maritalStatusId,
          educationDegreeId: dto.educationDegreeId,
          fieldOfStudy: dto.fieldOfStudy,
          isargariStatus: dto.isargariStatus,
          physicalStatusId: dto.physicalStatusId,
          address: dto.address,
          bankAccountNumber: dto.bankAccountNumber,
          shadMobileNumber: dto.shadMobileNumber,
          shadUsername: dto.shadUsername,
          districtId: dto.districtId,
          willingJudgeCultural: dto.willingJudgeCultural ?? false,
          willingJudgeQuranEtrat: dto.willingJudgeQuranEtrat ?? false,
          willingJudgeSports: dto.willingJudgeSports ?? false,
          judgeCertificateField: dto.judgeCertificateField,
          canLogin,
          passwordHash,
        },
      });

      if (dto.centerId && dto.academicYearId) {
        await tx.userCenterAssignment.create({
          data: { userId: created.id, centerId: dto.centerId, academicYearId: dto.academicYearId, isPrimary: true },
        });
      }

      return created;
    });

    if (dto.disabilities && dto.disabilities.length > 0) {
      await this.disabilityService.setForUser(user.id, dto.disabilities);
    }

    return this.findOne(user.id);
  }

  async update(id: number, dto: UpdateUserDto) {
    const existing = await this.findOne(id);

    // اگر کد ملی تغییر کرده، بررسی تکراری نبودن
    if (dto.nationalCode && dto.nationalCode !== existing.nationalCode) {
      const dup = await this.prisma.user.findFirst({
        where: { nationalCode: dto.nationalCode, NOT: { id } },
      });
      if (dup) throw new ConflictException(`کد ملی "${dto.nationalCode}" قبلاً ثبت شده`);
    }

    if (dto.personnelCode) {
      const dupCode = await this.prisma.user.findFirst({
        where: { personnelCode: dto.personnelCode, NOT: { id } },
      });
      if (dupCode) throw new ConflictException(`کد پرسنلی "${dto.personnelCode}" قبلاً ثبت شده`);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.nationalCode !== undefined && { nationalCode: dto.nationalCode }),
        ...(dto.personnelCode !== undefined && { personnelCode: dto.personnelCode }),
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.fatherName !== undefined && { fatherName: dto.fatherName }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.userType && { userType: dto.userType }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
        ...(dto.birthDay !== undefined && { birthDay: dto.birthDay }),
        ...(dto.birthMonth !== undefined && { birthMonth: dto.birthMonth }),
        ...(dto.birthYearShamsi !== undefined && { birthYearShamsi: dto.birthYearShamsi }),
        ...(dto.employmentTypeId !== undefined && { employmentTypeId: dto.employmentTypeId }),
        ...(dto.jobPositionId !== undefined && { jobPositionId: dto.jobPositionId }),
        ...(dto.employmentCategoryId !== undefined && { employmentCategoryId: dto.employmentCategoryId }),
        ...(dto.requiredHours !== undefined && { requiredHours: dto.requiredHours }),
        ...(dto.nonRequiredHours !== undefined && { nonRequiredHours: dto.nonRequiredHours }),
        ...(dto.exceptionalEntryDay !== undefined && { exceptionalEntryDay: dto.exceptionalEntryDay }),
        ...(dto.exceptionalEntryMonth !== undefined && { exceptionalEntryMonth: dto.exceptionalEntryMonth }),
        ...(dto.exceptionalEntryYear !== undefined && { exceptionalEntryYear: dto.exceptionalEntryYear }),
        ...(dto.serviceRecordYears !== undefined && { serviceRecordYears: dto.serviceRecordYears }),
        ...(dto.serviceRecordMonths !== undefined && { serviceRecordMonths: dto.serviceRecordMonths }),
        ...(dto.serviceRecordDays !== undefined && { serviceRecordDays: dto.serviceRecordDays }),
        ...(dto.maritalStatusId !== undefined && { maritalStatusId: dto.maritalStatusId }),
        ...(dto.educationDegreeId !== undefined && { educationDegreeId: dto.educationDegreeId }),
        ...(dto.fieldOfStudy !== undefined && { fieldOfStudy: dto.fieldOfStudy }),
        ...(dto.isargariStatus !== undefined && { isargariStatus: dto.isargariStatus }),
        ...(dto.physicalStatusId !== undefined && { physicalStatusId: dto.physicalStatusId }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.bankAccountNumber !== undefined && { bankAccountNumber: dto.bankAccountNumber }),
        ...(dto.shadMobileNumber !== undefined && { shadMobileNumber: dto.shadMobileNumber }),
        ...(dto.shadUsername !== undefined && { shadUsername: dto.shadUsername }),
        ...(dto.districtId !== undefined && { districtId: dto.districtId }),
        ...(dto.willingJudgeCultural !== undefined && { willingJudgeCultural: dto.willingJudgeCultural }),
        ...(dto.willingJudgeQuranEtrat !== undefined && { willingJudgeQuranEtrat: dto.willingJudgeQuranEtrat }),
        ...(dto.willingJudgeSports !== undefined && { willingJudgeSports: dto.willingJudgeSports }),
        ...(dto.judgeCertificateField !== undefined && { judgeCertificateField: dto.judgeCertificateField }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  // ─── مدیریت دسترسی ورود (فقط SUPERUSER) ───────────────────
  async setCanLogin(id: number, dto: SetCanLoginDto) {
    const user = await this.findOne(id);
    const data: Prisma.UserUpdateInput = { canLogin: dto.canLogin };

    // اگر دسترسی خاموش می‌شود، رمز و توکن پاک شود
    if (!dto.canLogin) {
      data.refreshToken = null;
    }
    // اگر دسترسی روشن می‌شود و رمز جدید داده شده، هش کن
    if (dto.canLogin && dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({ where: { id }, data });
  }

  async setDisabilities(userId: number, dto: SetDisabilitiesDto) {
    await this.findOne(userId);
    const rows = await this.disabilityService.setForUser(userId, dto.items);
    return { items: rows, isMultiple: this.disabilityService.isMultiple(rows.length) };
  }

  async changePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.findOne(id);
    if (!user.canLogin) throw new BadRequestException('این کاربر دسترسی لاگین ندارد');
    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hash } });
    return { message: 'رمز عبور با موفقیت تغییر کرد' };
  }

  async assignCenter(userId: number, dto: AssignCenterDto) {
    await this.findOne(userId);
    const center = await this.prisma.center.findUnique({ where: { id: Number(dto.centerId) } });
    if (!center) throw new NotFoundException('مرکز یافت نشد');
    const existing = await this.prisma.userCenterAssignment.findFirst({
      where: { userId, centerId: Number(dto.centerId), academicYearId: Number(dto.academicYearId), revokedAt: null },
    });
    if (existing) throw new ConflictException('این کاربر قبلاً به این مرکز در این سال تخصیص یافته');
    return this.prisma.userCenterAssignment.create({
      data: { userId, centerId: Number(dto.centerId), academicYearId: Number(dto.academicYearId), isPrimary: dto.isPrimary ?? true, note: dto.note },
    });
  }

  async transfer(userId: number, dto: TransferDto) {
    await this.findOne(userId);
    return this.prisma.$transaction(async (tx) => {
      const currentAssignments = await tx.userCenterAssignment.findMany({
        where: {
          userId, academicYearId: Number(dto.academicYearId), revokedAt: null,
          ...(dto.fromCenterId ? { centerId: Number(dto.fromCenterId) } : {}),
        },
      });
      if (dto.fromCenterId && currentAssignments.length === 0) {
        throw new NotFoundException('تخصیص فعلی در مرکز مبدأ یافت نشد');
      }
      for (const a of currentAssignments) {
        await tx.userCenterAssignment.update({ where: { id: a.id }, data: { revokedAt: new Date() } });
      }
      return tx.userCenterAssignment.create({
        data: { userId, centerId: Number(dto.toCenterId), academicYearId: Number(dto.academicYearId), isPrimary: true, note: dto.note },
      });
    });
  }

  async revokeCenter(assignmentId: number) {
    const assignment = await this.prisma.userCenterAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('تخصیص یافت نشد');
    if (assignment.revokedAt) throw new BadRequestException('این تخصیص قبلاً لغو شده');
    return this.prisma.userCenterAssignment.update({ where: { id: assignmentId }, data: { revokedAt: new Date() } });
  }

  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { isActive: false, canLogin: false } });
  }

  async exportExcel(dto: ExcelExportDto, requester: JwtPayload, res: Response) {
    const result = await this.findAll({ ...dto, page: 1, pageSize: 10000 }, requester);
    const flat = (result.data as any[]).map((u) => ({
      ...u,
      fullName: `${u.firstName} ${u.lastName}`,
      currentStatus: u.personnelStatusHistory[0]?.statusType?.label ?? '—',
      centerName: u.centerAssignments[0]?.center?.name ?? '—',
      city: u.centerAssignments[0]?.center?.city ?? '—',
      genderLabel: u.gender === 'MALE' ? 'مرد' : 'زن',
      userTypeLabel: this.typeLabel(u.userType),
      isActiveLabel: u.isActive ? 'فعال' : 'غیرفعال',
      canLoginLabel: u.canLogin ? 'بله' : 'خیر',
      jobPositionLabel: u.jobPosition?.label ?? '—',
      employmentTypeLabel: u.employmentType?.label ?? '—',
      employmentCategoryLabel: u.employmentCategory?.label ?? '—',
      educationDegreeLabel: u.educationDegree?.label ?? '—',
      maritalStatusLabel: u.maritalStatus?.label ?? '—',
      districtLabel: u.district?.label ?? '—',
      physicalStatusLabel: u.physicalStatus?.label ?? '—',
      disabilityLabels: (u.disabilities ?? []).map((d: any) => d.disabilityType?.label).filter(Boolean).join('، ') || '—',
      isMultipleDisabilityLabel: u.isMultipleDisability ? 'بله' : 'خیر',
      birthDateShamsi:
        u.birthYearShamsi && u.birthMonth && u.birthDay
          ? `${u.birthYearShamsi}/${String(u.birthMonth).padStart(2, '0')}/${String(u.birthDay).padStart(2, '0')}`
          : '—',
    }));
    await this.excelExport.export({ data: flat, columns: dto.columns, sheetName: dto.sheetName, filename: dto.filename ?? 'personnel', res });
  }

  private withMultipleDisabilityTag<T extends { disabilities?: unknown[] }>(user: T) {
    const count = user.disabilities?.length ?? 0;
    return { ...user, isMultipleDisability: this.disabilityService.isMultiple(count) };
  }

  private typeLabel(t: string) {
    const m: Record<string, string> = {
      SUPERUSER: 'سوپریوزر', CENTER_MANAGER: 'مدیر مرکز', TEACHER: 'معلم', STAFF: 'کارمند', STUDENT: 'دانش‌آموز',
    };
    return m[t] ?? t;
  }
}

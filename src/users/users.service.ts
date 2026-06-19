// src/users/users.service.ts (کامل)
import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService }        from '../prisma/prisma.service';
import { FilterBuilderService } from '../common/filters/filter-builder.service';
import { ExcelExportService }   from '../common/excel/excel-export.service';
import { SmartFilterDto, ExcelExportDto } from '../common/filters/smart-filter.dto';
import {
  CreateUserDto, UpdateUserDto, ChangePasswordDto,
  AssignCenterDto, TransferDto,
} from './dto/user.dto';
import { JwtPayload }  from '../auth/auth.service';
import { Prisma, UserType }    from '@prisma/client';
import { Response }    from 'express';
import * as bcrypt     from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma:        PrismaService,
    private filterBuilder: FilterBuilderService,
    private excelExport:   ExcelExportService,
  ) {}

  // ─── List ──────────────────────────────────────────────────
  async findAll(dto: SmartFilterDto, requester: JwtPayload) {
    const { where, orderBy, skip, take } = this.filterBuilder.build(dto);

    const scopeWhere =
      requester.type === UserType.SUPERUSER
        ? where
        : {
            AND: [
              where,
              { centerAssignments: { some: { centerId: { in: requester.centerIds }, revokedAt: null } } },
            ],
          };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: scopeWhere as Prisma.UserWhereInput, orderBy, skip, take,
        select: {
          id: true, nationalCode: true, firstName: true, lastName: true,
          gender: true, userType: true, phone: true, email: true,
          birthDate: true, isActive: true, canLogin: true, createdAt: true,
          centerAssignments: {
            where: { revokedAt: null },
            include: { center: { select: { id: true, name: true, city: true } }, academicYear: { select: { id: true, label: true } } },
          },
          personnelStatusHistory: {
            orderBy: { effectiveDate: 'desc' }, take: 1,
            include: { statusType: { select: { label: true, code: true } } },
          },
        },
      }),
      this.prisma.user.count({
        where: scopeWhere as Prisma.UserWhereInput,
      }),
    ]);

    return { data, total, page: dto.page ?? 1, pageSize: take, pageCount: Math.ceil(total / take) };
  }

  // ─── Single ────────────────────────────────────────────────
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        centerAssignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            center:      { select: { id: true, name: true, city: true } },
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
    return user;
  }

  // ─── Create ────────────────────────────────────────────────
  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { nationalCode: dto.nationalCode } });
    if (exists) throw new ConflictException(`کد ملی "${dto.nationalCode}" قبلاً ثبت شده`);

    const canLogin = (
      [UserType.SUPERUSER, UserType.CENTER_MANAGER] as UserType[]
    ).includes(dto.userType);
    const passwordHash = dto.password && canLogin
      ? await bcrypt.hash(dto.password, 10)
      : null;

    return this.prisma.user.create({
      data: {
        nationalCode: dto.nationalCode,
        firstName:    dto.firstName,
        lastName:     dto.lastName,
        gender:       dto.gender,
        userType:     dto.userType,
        phone:        dto.phone,
        email:        dto.email,
        birthDate:    dto.birthDate ? new Date(dto.birthDate) : null,
        canLogin,
        passwordHash,
      },
    });
  }

  // ─── Update ────────────────────────────────────────────────
  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName  && { lastName:  dto.lastName  }),
        ...(dto.gender    && { gender:    dto.gender    }),
        ...(dto.userType  && { userType:  dto.userType  }),
        ...(dto.phone     !== undefined && { phone:     dto.phone }),
        ...(dto.email     !== undefined && { email:     dto.email }),
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
        ...(dto.isActive  !== undefined && { isActive:  dto.isActive }),
      },
    });
  }

  // ─── Change Password ───────────────────────────────────────
  async changePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.findOne(id);
    if (!user.canLogin) throw new BadRequestException('این کاربر دسترسی لاگین ندارد');
    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hash } });
    return { message: 'رمز عبور با موفقیت تغییر کرد' };
  }

  // ─── Assign to Center ──────────────────────────────────────
  async assignCenter(userId: number, dto: AssignCenterDto) {
    await this.findOne(userId);

    // بررسی مرکز
    const center = await this.prisma.center.findUnique({ where: { id: Number(dto.centerId) } });
    if (!center) throw new NotFoundException('مرکز یافت نشد');

    // بررسی تخصیص تکراری
    const existing = await this.prisma.userCenterAssignment.findFirst({
      where: { userId, centerId: Number(dto.centerId), academicYearId: Number(dto.academicYearId), revokedAt: null },
    });
    if (existing) throw new ConflictException('این کاربر قبلاً به این مرکز در این سال تخصیص یافته');

    return this.prisma.userCenterAssignment.create({
      data: {
        userId,
        centerId:       Number(dto.centerId),
        academicYearId: Number(dto.academicYearId),
        isPrimary:      dto.isPrimary ?? true,
        note:           dto.note,
      },
    });
  }

  // ─── Transfer (نقل‌وانتقال) ────────────────────────────────
  async transfer(userId: number, dto: TransferDto) {
    await this.findOne(userId);

    return this.prisma.$transaction(async (tx) => {
      // پایان دادن به تخصیص فعلی
      const current = await tx.userCenterAssignment.findFirst({
        where: {
          userId,
          centerId:       Number(dto.fromCenterId),
          academicYearId: Number(dto.academicYearId),
          revokedAt:      null,
        },
      });
      if (!current) throw new NotFoundException('تخصیص فعلی در مرکز مبدأ یافت نشد');

      await tx.userCenterAssignment.update({
        where: { id: current.id },
        data:  { revokedAt: new Date() },
      });

      // تخصیص جدید به مرکز مقصد
      return tx.userCenterAssignment.create({
        data: {
          userId,
          centerId:       Number(dto.toCenterId),
          academicYearId: Number(dto.academicYearId),
          isPrimary:      true,
          note:           dto.note,
        },
      });
    });
  }

  // ─── Revoke Center ─────────────────────────────────────────
  async revokeCenter(assignmentId: number) {
    const assignment = await this.prisma.userCenterAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('تخصیص یافت نشد');
    if (assignment.revokedAt) throw new BadRequestException('این تخصیص قبلاً لغو شده');

    return this.prisma.userCenterAssignment.update({
      where: { id: assignmentId },
      data:  { revokedAt: new Date() },
    });
  }

  // ─── Deactivate ────────────────────────────────────────────
  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { isActive: false, canLogin: false } });
  }

  // ─── Excel Export ──────────────────────────────────────────
  async exportExcel(dto: ExcelExportDto, requester: JwtPayload, res: Response) {
    const result = await this.findAll({ ...dto, page: 1, pageSize: 10000 }, requester);
    const flat = (result.data as any[]).map(u => ({
      ...u,
      fullName:      `${u.firstName} ${u.lastName}`,
      currentStatus: u.personnelStatusHistory[0]?.statusType?.label ?? '—',
      centerName:    u.centerAssignments[0]?.center?.name ?? '—',
      city:          u.centerAssignments[0]?.center?.city ?? '—',
      genderLabel:   u.gender === 'MALE' ? 'مرد' : 'زن',
      userTypeLabel: this.typeLabel(u.userType),
      isActiveLabel: u.isActive ? 'فعال' : 'غیرفعال',
    }));
    await this.excelExport.export({ data: flat, columns: dto.columns, sheetName: dto.sheetName, filename: dto.filename ?? 'personnel', res });
  }

  private typeLabel(t: string) {
    const m: Record<string, string> = {
      SUPERUSER: 'سوپریوزر', CENTER_MANAGER: 'مدیر مرکز',
      TEACHER: 'معلم', STAFF: 'کارمند', STUDENT: 'دانش‌آموز',
    };
    return m[t] ?? t;
  }
}

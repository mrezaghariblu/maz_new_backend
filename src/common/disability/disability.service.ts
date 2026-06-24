// src/common/disability/disability.service.ts
// ============================================================
// منطق مشترک Assign معلولیت — هم برای پرسنل (User) هم دانش‌آموز (Student)
// یک نفر می‌تواند چند معلولیت داشته باشد. تگ «چندمعلولیتی» ذخیره
// نمی‌شود؛ همیشه از روی تعداد ردیف‌ها محاسبه می‌شود.
// ============================================================

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignDisabilityDto } from '../../users/dto/user.dto';

const AUTISM_CODE = 'AUTISM';

@Injectable()
export class DisabilityService {
  constructor(private prisma: PrismaService) {}

  // اعتبارسنجی: disabilityTypeId باید واقعاً در گروه DISABILITY_TYPE و فعال باشد،
  // و autismLevel فقط برای کد AUTISM مجاز است.
  private async validate(items: AssignDisabilityDto[]) {
    if (items.length === 0) return;

    const ids = items.map((i) => i.disabilityTypeId);
    const rows = await this.prisma.lookupValue.findMany({
      where: { id: { in: ids }, groupKey: 'DISABILITY_TYPE', isActive: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));

    for (const item of items) {
      const row = byId.get(item.disabilityTypeId) as any;
      if (!row) {
        throw new BadRequestException(
          `نوع معلولیت با شناسه ${item.disabilityTypeId} معتبر نیست`,
        );
      }
      if (item.autismLevel && row.code !== AUTISM_CODE) {
        throw new BadRequestException(
          'سطح اتیسم فقط برای نوع معلولیت «اوتیسم» قابل ثبت است',
        );
      }
    }

    const dupIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (dupIds.length > 0) {
      throw new BadRequestException('هر نوع معلولیت فقط یک‌بار قابل ثبت است');
    }
  }

  // جایگزینی کامل لیست معلولیت‌های یک پرسنل
  async setForUser(userId: number, items: AssignDisabilityDto[]) {
    await this.validate(items);
    return this.prisma.$transaction(async (tx) => {
      await tx.userDisability.deleteMany({ where: { userId } });
      if (items.length > 0) {
        await tx.userDisability.createMany({
          data: items.map((i) => ({
            userId,
            disabilityTypeId: i.disabilityTypeId,
            severity: i.severity,
            autismLevel: i.autismLevel,
          })),
        });
      }
      return tx.userDisability.findMany({
        where: { userId },
        include: { disabilityType: true },
      });
    });
  }

  // جایگزینی کامل لیست معلولیت‌های یک دانش‌آموز
  async setForStudent(studentId: number, items: AssignDisabilityDto[]) {
    await this.validate(items);
    return this.prisma.$transaction(async (tx) => {
      await tx.studentDisability.deleteMany({ where: { studentId } });
      if (items.length > 0) {
        await tx.studentDisability.createMany({
          data: items.map((i) => ({
            studentId,
            disabilityTypeId: i.disabilityTypeId,
            severity: i.severity,
            autismLevel: i.autismLevel,
          })),
        });
      }
      return tx.studentDisability.findMany({
        where: { studentId },
        include: { disabilityType: true },
      });
    });
  }

  // برچسب «چندمعلولیتی» — همیشه محاسبه‌شده، هیچ‌وقت ذخیره نمی‌شود
  isMultiple(disabilityCount: number): boolean {
    return disabilityCount > 1;
  }
}

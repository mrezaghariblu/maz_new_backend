// src/lookups/lookups.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLookupValueDto, UpdateLookupValueDto } from './dto/lookup.dto';

@Injectable()
export class LookupsService {
  constructor(private prisma: PrismaService) {}

  // گرفتن مقادیر یک گروه خاص (مثلاً JOB_POSITION) — مرتب‌شده با sortOrder
  async findByGroup(groupKey: string, includeInactive = false) {
    return this.prisma.lookupValue.findMany({
      where: { groupKey, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // گرفتن همه‌ی گروه‌ها یک‌جا، دسته‌بندی‌شده بر اساس groupKey
  // (مفید برای فرانت برای پر کردن همه‌ی dropdownها با یک درخواست)
  async findAllGrouped(includeInactive = false) {
    const all = await this.prisma.lookupValue.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ groupKey: 'asc' }, { sortOrder: 'asc' }],
    });
    const grouped: Record<string, typeof all> = {};
    for (const item of all) {
      (grouped[item.groupKey] ??= []).push(item);
    }
    return grouped;
  }

  async create(dto: CreateLookupValueDto) {
    const exists = await this.prisma.lookupValue.findUnique({
      where: { groupKey_code: { groupKey: dto.groupKey, code: dto.code } },
    });
    if (exists) {
      throw new ConflictException(
        `مقدار با کد "${dto.code}" در گروه "${dto.groupKey}" قبلاً وجود دارد`,
      );
    }
    return this.prisma.lookupValue.create({ data: dto });
  }

  async update(id: number, dto: UpdateLookupValueDto) {
    const row = await this.prisma.lookupValue.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('مقدار مرجع یافت نشد');
    return this.prisma.lookupValue.update({ where: { id }, data: dto });
  }

  // غیرفعال کردن به‌جای حذف (چون ممکنه قبلاً به رکوردهایی Assign شده باشه)
  async deactivate(id: number) {
    const row = await this.prisma.lookupValue.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('مقدار مرجع یافت نشد');
    return this.prisma.lookupValue.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

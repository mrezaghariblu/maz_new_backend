// src/academic-years/academic-years.service.ts
import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
} from './dto/academic-year.dto';

@Injectable()
export class AcademicYearsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async findActive() {
    const year = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
    });
    if (!year) throw new NotFoundException('سال تحصیلی فعال یافت نشد');
    return year;
  }

  async create(dto: CreateAcademicYearDto) {
    return this.prisma.academicYear.create({
      data: {
        label:      dto.label,
        startDate:  new Date(dto.startDate),
        endDate:    new Date(dto.endDate),
        isActive:   false,
        isArchived: false,
      },
    });
  }

  async setActive(id: number) {
    const year = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!year) throw new NotFoundException('سال تحصیلی یافت نشد');
    if (year.isArchived) throw new BadRequestException('سال بایگانی‌شده را نمی‌توان فعال کرد');

    // غیرفعال کردن همه، فعال کردن این یکی
    await this.prisma.$transaction([
      this.prisma.academicYear.updateMany({ data: { isActive: false } }),
      this.prisma.academicYear.update({ where: { id }, data: { isActive: true } }),
    ]);
    return this.prisma.academicYear.findUnique({ where: { id } });
  }

  async archive(id: number) {
    const year = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!year) throw new NotFoundException('سال تحصیلی یافت نشد');
    if (year.isActive) throw new BadRequestException('سال فعال را نمی‌توان بایگانی کرد');
    if (year.isArchived) throw new BadRequestException('این سال قبلاً بایگانی شده');

    return this.prisma.academicYear.update({
      where: { id },
      data:  { isArchived: true },
    });
  }

  async update(id: number, dto: UpdateAcademicYearDto) {
    const year = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!year) throw new NotFoundException('سال تحصیلی یافت نشد');
    if (year.isArchived) throw new BadRequestException('سال بایگانی‌شده قابل ویرایش نیست');

    return this.prisma.academicYear.update({
      where: { id },
      data: {
        ...(dto.label     && { label:     dto.label }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate   && { endDate:   new Date(dto.endDate) }),
      },
    });
  }
}

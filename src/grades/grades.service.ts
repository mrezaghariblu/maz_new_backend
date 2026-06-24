import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto, UpdateGradeDto } from './dto/grade.dto';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  findAll(educationLevelId?: number, includeInactive = false) {
    return this.prisma.grade.findMany({
      where: {
        ...(educationLevelId ? { educationLevelId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: { educationLevel: true },
      orderBy: [{ educationLevelId: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findOne(id: number) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: { educationLevel: true },
    });
    if (!grade) throw new NotFoundException('پایه‌ی تحصیلی یافت نشد');
    return grade;
  }

  async create(dto: CreateGradeDto) {
    const exists = await this.prisma.grade.findUnique({
      where: { educationLevelId_code: { educationLevelId: dto.educationLevelId, code: dto.code } },
    });
    if (exists) throw new ConflictException(`پایه با کد "${dto.code}" در این مقطع قبلاً وجود دارد`);
    return this.prisma.grade.create({ data: dto });
  }

  async update(id: number, dto: UpdateGradeDto) {
    await this.findOne(id);
    return this.prisma.grade.update({ where: { id }, data: dto });
  }

  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.grade.update({ where: { id }, data: { isActive: false } });
  }
}

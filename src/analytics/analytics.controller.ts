// src/analytics/analytics.controller.ts
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserType } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  // گزارش چندبعدی — همه نقش‌ها
  @Post('query')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  query(@Body() dto: AnalyticsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.svc.query(dto, user);
  }

  // خلاصه داشبورد سوپریوزر
  @Get('summary/superuser')
  @Roles(UserType.SUPERUSER)
  superuserSummary(@Query('academicYearId') yearId?: string) {
    return this.svc.getSuperuserSummary(yearId ? +yearId : undefined);
  }

  // خلاصه داشبورد مدیر مرکز
  @Get('summary/center')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  centerSummary(
    @Query('centerId') centerId: string,
    @Query('academicYearId') yearId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const cid = centerId ? +centerId : user?.centerIds?.[0];
    if (!cid) throw new Error('centerId الزامی است');
    return this.svc.getCenterSummary(cid, yearId ? +yearId : undefined);
  }
}

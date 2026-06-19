
// src/audit/audit.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SmartFilterDto } from '../common/filters/smart-filter.dto';
import { UserType } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.service';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private svc: AuditService) {}

  @Post('list')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findAll(@Body() dto: SmartFilterDto, @CurrentUser() user: JwtPayload) {
    return this.svc.findAll(dto, user);
  }

  @Get('summary/:academicYearId')
  @Roles(UserType.SUPERUSER)
  summary(@Param('academicYearId') yearId: string) {
    return this.svc.summary(+yearId);
  }
}

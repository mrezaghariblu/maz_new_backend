// src/students/students.controller.ts
import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Put, Res, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditEntity, AuditAction, AuditInterceptor } from '../common/audit/audit.interceptor';
import { UserType } from '@prisma/client';
import type { Response } from 'express';
import type { JwtPayload } from '../auth/auth.service';
import { ExcelExportDto, SmartFilterDto } from '../common/filters/smart-filter.dto';
import { StudentsService } from './students.service';
import {
  CreateStudentDto, UpdateStudentDto, SetAssistiveDevicesDto,
  AssignToClassDto, PromotionDecisionDto,
} from './dto/student.dto';
import { SetDisabilitiesDto } from '../users/dto/user.dto';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private svc: StudentsService) {}

  @Post('list')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findAll(@Body() dto: SmartFilterDto, @CurrentUser() user: JwtPayload) {
    return this.svc.findAll(dto, user);
  }

  @Post('export/excel')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  exportExcel(@Body() dto: ExcelExportDto, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    return this.svc.exportExcel(dto, user, res);
  }

  @Get(':id')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findOne(@Param('id') id: string) { return this.svc.findOne(+id); }

  @Post()
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('Student') @AuditAction('CREATE')
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('Student') @AuditAction('UPDATE')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.svc.update(+id, dto);
  }

  @Put(':id/disabilities')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  setDisabilities(@Param('id') id: string, @Body() dto: SetDisabilitiesDto) {
    return this.svc.setDisabilities(+id, dto.items);
  }

  @Put(':id/assistive-devices')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  setAssistiveDevices(@Param('id') id: string, @Body() dto: SetAssistiveDevicesDto) {
    return this.svc.setAssistiveDevices(+id, dto);
  }

  @Post(':id/class-assignment')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('StudentClassAssignment') @AuditAction('CREATE')
  assignToClass(@Param('id') id: string, @Body() dto: AssignToClassDto, @CurrentUser() user: JwtPayload) {
    return this.svc.assignToClass(+id, dto, user);
  }

  @Patch('class-assignments/:assignmentId/revoke')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  revokeClassAssignment(@Param('assignmentId') id: string) {
    return this.svc.revokeClassAssignment(+id);
  }

  @Post(':id/promotion')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('StudentPromotionDecision') @AuditAction('CREATE')
  recordPromotion(@Param('id') id: string, @Body() dto: PromotionDecisionDto, @CurrentUser() user: JwtPayload) {
    return this.svc.recordPromotion(+id, dto, user);
  }

  @Delete(':id')
  @Roles(UserType.SUPERUSER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('Student') @AuditAction('DELETE')
  deactivate(@Param('id') id: string) { return this.svc.deactivate(+id); }
}

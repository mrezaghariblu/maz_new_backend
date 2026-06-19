// src/students/students.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  AuditEntity,
  AuditAction,
  AuditInterceptor,
} from '../common/audit/audit.interceptor';
import { UserType } from '@prisma/client';
import type { Response } from 'express';
import type { JwtPayload } from '../auth/auth.service';
import {
  ExcelExportDto,
  SmartFilterDto,
} from '../common/filters/smart-filter.dto';
import { StudentsService } from './students.service';
import {
  CreateStudentDto,
  EnrollStudentDto,
  UpdateStudentDto,
} from './dto/students.dto';

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
  exportExcel(
    @Body() dto: ExcelExportDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    return this.svc.exportExcel(dto, user, res);
  }

  @Get(':id')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post()
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('Student')
  @AuditAction('CREATE')
  create(@Body() dto: CreateStudentDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('Student')
  @AuditAction('UPDATE')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.svc.update(+id, dto);
  }

  @Post(':id/enroll')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('StudentEnrollment')
  @AuditAction('CREATE')
  enroll(@Param('id') id: string, @Body() dto: EnrollStudentDto) {
    return this.svc.enroll(+id, dto);
  }

  @Delete(':id')
  @Roles(UserType.SUPERUSER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('Student')
  @AuditAction('DELETE')
  deactivate(@Param('id') id: string) {
    return this.svc.deactivate(+id);
  }
}

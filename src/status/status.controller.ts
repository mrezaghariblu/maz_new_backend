
// src/status/status.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '@prisma/client';
import {
  CreateStatusTypeDto,
  RecordStatusDto,
  StatusTarget,
} from './dto/status.dto';
import { StatusService } from './status.service';

@Controller('status')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatusController {
  constructor(private svc: StatusService) {}

  // انواع وضعیت
  @Get('types/:target')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  getTypes(@Param('target') target: StatusTarget) {
    return this.svc.getStatusTypes(target);
  }

  @Post('types')
  @Roles(UserType.SUPERUSER)
  createType(@Body() dto: CreateStatusTypeDto) {
    return this.svc.createStatusType(dto);
  }

  // ثبت وضعیت
  @Post('personnel')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  recordPersonnel(@Body() dto: RecordStatusDto) {
    return this.svc.recordPersonnelStatus(dto);
  }

  @Post('student')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  recordStudent(@Body() dto: RecordStatusDto) {
    return this.svc.recordStudentStatus(dto);
  }

  @Post('center')
  @Roles(UserType.SUPERUSER)
  recordCenter(@Body() dto: RecordStatusDto) {
    return this.svc.recordCenterStatus(dto);
  }

  // تاریخچه
  @Get('personnel/:userId/history')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  personnelHistory(
    @Param('userId') userId: string,
    @Query('academicYearId') yearId?: string,
  ) {
    return this.svc.getPersonnelHistory(+userId, yearId ? +yearId : undefined);
  }

  @Get('student/:studentId/history')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  studentHistory(
    @Param('studentId') id: string,
    @Query('academicYearId') yearId?: string,
  ) {
    return this.svc.getStudentHistory(+id, yearId ? +yearId : undefined);
  }

  @Get('center/:centerId/history')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  centerHistory(
    @Param('centerId') id: string,
    @Query('academicYearId') yearId?: string,
  ) {
    return this.svc.getCenterHistory(+id, yearId ? +yearId : undefined);
  }

  // حذف رکورد
  @Delete('personnel/record/:id')
  @Roles(UserType.SUPERUSER)
  deletePersonnelRecord(@Param('id') id: string) {
    return this.svc.deletePersonnelStatusRecord(+id);
  }
}
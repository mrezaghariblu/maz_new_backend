import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { UserType } from '@prisma/client';
import { ClassesService } from './classes.service';
import {
  AssignTeacherDto,
  CreateClassRoomDto,
  SetClassGradesDto,
  UpdateClassRoomDto,
} from './dto/class.dto';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private svc: ClassesService) {}

  @Get()
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('centerId') centerId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.svc.findAll(user, centerId ? +centerId : undefined, academicYearId ? +academicYearId : undefined);
  }

  @Post('list')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  async findAllPost(
    @Body() body: { centerId?: number; academicYearId?: number; page?: number; pageSize?: number },
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.svc.findAll(user, body.centerId, body.academicYearId);
    return { data, total: data.length };
  }

  @Get(':id')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.findOne(+id, user);
  }

  @Post()
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  create(@Body() dto: CreateClassRoomDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateClassRoomDto, @CurrentUser() user: JwtPayload) {
    return this.svc.update(+id, dto, user);
  }

  @Put(':id/grades')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  setGrades(@Param('id') id: string, @Body() dto: SetClassGradesDto, @CurrentUser() user: JwtPayload) {
    return this.svc.setGrades(+id, dto, user);
  }

  @Post(':id/teachers')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  assignTeacher(@Param('id') id: string, @Body() dto: AssignTeacherDto, @CurrentUser() user: JwtPayload) {
    return this.svc.assignTeacher(+id, dto, user);
  }

  @Patch('teacher-assignments/:assignmentId/revoke')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  revokeTeacher(@Param('assignmentId') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.revokeTeacherAssignment(+id, user);
  }

  @Delete(':id')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.deactivate(+id, user);
  }
}

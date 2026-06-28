// src/users/users.controller.ts
import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Put, Res, UseGuards, UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CenterScopeGuard } from '../auth/guards/center-scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { AuditEntity, AuditAction, AuditInterceptor } from '../common/audit/audit.interceptor';
import { SmartFilterDto, ExcelExportDto } from '../common/filters/smart-filter.dto';
import { UsersService } from './users.service';
import {
  CreateUserDto, UpdateUserDto, ChangePasswordDto,
  AssignCenterDto, TransferDto, SetDisabilitiesDto, SetCanLoginDto,
} from './dto/user.dto';
import { UserType } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private svc: UsersService) {}

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
  @UseGuards(CenterScopeGuard)
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('User') @AuditAction('CREATE')
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('User') @AuditAction('UPDATE')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.svc.update(+id, dto);
  }

  // ─── مدیریت دسترسی ورود — فقط SUPERUSER ──────────────────
  @Patch(':id/can-login')
  @Roles(UserType.SUPERUSER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('User') @AuditAction('UPDATE')
  setCanLogin(@Param('id') id: string, @Body() dto: SetCanLoginDto) {
    return this.svc.setCanLogin(+id, dto);
  }

  @Put(':id/disabilities')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('UserDisability') @AuditAction('UPDATE')
  setDisabilities(@Param('id') id: string, @Body() dto: SetDisabilitiesDto) {
    return this.svc.setDisabilities(+id, dto);
  }

  @Patch(':id/password')
  @Roles(UserType.SUPERUSER)
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.svc.changePassword(+id, dto);
  }

  @Post(':id/assign-center')
  @Roles(UserType.SUPERUSER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('UserCenterAssignment') @AuditAction('CREATE')
  assignCenter(@Param('id') id: string, @Body() dto: AssignCenterDto) {
    return this.svc.assignCenter(+id, dto);
  }

  @Post(':id/transfer')
  @Roles(UserType.SUPERUSER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('UserCenterAssignment') @AuditAction('UPDATE')
  transfer(@Param('id') id: string, @Body() dto: TransferDto) {
    return this.svc.transfer(+id, dto);
  }

  @Patch('assignments/:assignmentId/revoke')
  @Roles(UserType.SUPERUSER)
  revokeCenter(@Param('assignmentId') id: string) {
    return this.svc.revokeCenter(+id);
  }

  @Delete(':id')
  @Roles(UserType.SUPERUSER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('User') @AuditAction('DELETE')
  deactivate(@Param('id') id: string) { return this.svc.deactivate(+id); }
}

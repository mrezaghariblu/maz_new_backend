// src/centers/centers.controller.ts
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
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CenterScopeGuard } from '../auth/guards/center-scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import {
  AuditEntity,
  AuditAction,
  AuditInterceptor,
} from '../common/audit/audit.interceptor';
import {
  SmartFilterDto,
  ExcelExportDto,
} from '../common/filters/smart-filter.dto';
import { UserType } from '@prisma/client';
import { CentersService } from './centers.service';
import { CreateCenterDto, UpdateCenterDto } from './dto/center.dto';

@Controller('centers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CentersController {
  constructor(private svc: CentersService) {}

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
  @UseGuards(CenterScopeGuard)
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post()
  @Roles(UserType.SUPERUSER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('Center')
  @AuditAction('CREATE')
  create(@Body() dto: CreateCenterDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles(UserType.SUPERUSER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('Center')
  @AuditAction('UPDATE')
  update(@Param('id') id: string, @Body() dto: UpdateCenterDto) {
    return this.svc.update(+id, dto);
  }

  @Delete(':id')
  @Roles(UserType.SUPERUSER)
  @UseInterceptors(AuditInterceptor)
  @AuditEntity('Center')
  @AuditAction('DELETE')
  deactivate(@Param('id') id: string) {
    return this.svc.deactivate(+id);
  }
}
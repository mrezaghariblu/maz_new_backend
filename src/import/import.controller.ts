// src/import/import.controller.ts
import {
  Controller, Get, Post, Query, Res,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { UserType } from '@prisma/client';
import type { Response } from 'express';
import { ImportService } from './import.service';

@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportController {
  constructor(private svc: ImportService) {}

  @Get('template/students')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  studentTemplate(@Res() res: Response) {
    return this.svc.downloadStudentTemplate(res as any);
  }

  @Get('template/personnel')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  personnelTemplate(@Res() res: Response) {
    return this.svc.downloadPersonnelTemplate(res as any);
  }

  @Post('preview/students')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  previewStudents(@UploadedFile() file: any) {
    if (!file) throw new Error('فایل آپلود نشده');
    return this.svc.previewStudents(Buffer.from(file.buffer));
  }

  @Post('preview/personnel')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  previewPersonnel(@UploadedFile() file: any) {
    if (!file) throw new Error('فایل آپلود نشده');
    return this.svc.previewPersonnel(Buffer.from(file.buffer));
  }

  @Post('students')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  importStudents(
    @UploadedFile() file: any,
    @Query('centerId') centerId: string,
    @Query('academicYearId') academicYearId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new Error('فایل آپلود نشده');
    return this.svc.importStudents(
      Buffer.from(file.buffer),
      centerId ? +centerId : undefined,
      academicYearId ? +academicYearId : undefined,
      user,
    );
  }
}

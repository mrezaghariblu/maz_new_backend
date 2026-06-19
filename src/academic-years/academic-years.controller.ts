// src/academic-years/academic-years.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '@prisma/client';
import { AcademicYearsService } from './academic-years.service';
import { CreateAcademicYearDto, UpdateAcademicYearDto } from './dto/academic-year.dto';

@Controller('academic-years')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicYearsController {
  constructor(private svc: AcademicYearsService) {}

  @Get()
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findAll() {
    return this.svc.findAll();
  }

  @Get('active')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findActive() {
    return this.svc.findActive();
  }

  @Post()
  @Roles(UserType.SUPERUSER)
  create(@Body() dto: CreateAcademicYearDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles(UserType.SUPERUSER)
  update(@Param('id') id: string, @Body() dto: UpdateAcademicYearDto) {
    return this.svc.update(+id, dto);
  }

  @Patch(':id/activate')
  @Roles(UserType.SUPERUSER)
  activate(@Param('id') id: string) {
    return this.svc.setActive(+id);
  }

  @Patch(':id/archive')
  @Roles(UserType.SUPERUSER)
  archive(@Param('id') id: string) {
    return this.svc.archive(+id);
  }
}

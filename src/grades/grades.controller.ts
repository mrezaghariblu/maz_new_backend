import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '@prisma/client';
import { GradesService } from './grades.service';
import { CreateGradeDto, UpdateGradeDto } from './dto/grade.dto';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private svc: GradesService) {}

  @Get()
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findAll(@Query('educationLevelId') educationLevelId?: string) {
    return this.svc.findAll(educationLevelId ? +educationLevelId : undefined);
  }

  @Get(':id')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post()
  @Roles(UserType.SUPERUSER)
  create(@Body() dto: CreateGradeDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles(UserType.SUPERUSER)
  update(@Param('id') id: string, @Body() dto: UpdateGradeDto) {
    return this.svc.update(+id, dto);
  }

  @Delete(':id')
  @Roles(UserType.SUPERUSER)
  deactivate(@Param('id') id: string) {
    return this.svc.deactivate(+id);
  }
}

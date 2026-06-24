// src/lookups/lookups.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '@prisma/client';
import { LookupsService } from './lookups.service';
import { CreateLookupValueDto, UpdateLookupValueDto } from './dto/lookup.dto';

@Controller('lookups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LookupsController {
  constructor(private svc: LookupsService) {}

  // GET /lookups?groupKey=JOB_POSITION
  // GET /lookups  → همه‌ی گروه‌ها یک‌جا (برای پر کردن همه‌ی dropdownهای فرم)
  @Get()
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  findAll(@Query('groupKey') groupKey?: string) {
    return groupKey
      ? this.svc.findByGroup(groupKey)
      : this.svc.findAllGrouped();
  }

  @Post()
  @Roles(UserType.SUPERUSER)
  create(@Body() dto: CreateLookupValueDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles(UserType.SUPERUSER)
  update(@Param('id') id: string, @Body() dto: UpdateLookupValueDto) {
    return this.svc.update(+id, dto);
  }

  @Delete(':id')
  @Roles(UserType.SUPERUSER)
  deactivate(@Param('id') id: string) {
    return this.svc.deactivate(+id);
  }
}

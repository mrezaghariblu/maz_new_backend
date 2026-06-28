// src/smart-class/smart-class.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserType } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.service';
import { SmartClassService } from './smart-class.service';
import { GenerateProposalDto, ConfirmProposalDto } from './smart-class.dto';
import { ForbiddenException } from '@nestjs/common';

@Controller('smart-class')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SmartClassController {
  constructor(private svc: SmartClassService) {}

  @Post('generate')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  generate(@Body() dto: GenerateProposalDto, @CurrentUser() user: JwtPayload) {
    if (user.type === UserType.CENTER_MANAGER && !user.centerIds?.includes(dto.centerId)) {
      throw new ForbiddenException('دسترسی به این مرکز مجاز نیست');
    }
    return this.svc.generateProposal(dto.centerId, dto.academicYearId);
  }

  @Post('confirm')
  @Roles(UserType.SUPERUSER, UserType.CENTER_MANAGER)
  confirm(@Body() dto: ConfirmProposalDto, @CurrentUser() user: JwtPayload) {
    if (user.type === UserType.CENTER_MANAGER && !user.centerIds?.includes(dto.centerId)) {
      throw new ForbiddenException('دسترسی به این مرکز مجاز نیست');
    }
    return this.svc.confirmProposal(dto.centerId, dto.academicYearId, dto.classes ?? []);
  }
}

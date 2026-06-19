// src/auth/auth.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.nationalCode, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @CurrentUser() user: JwtPayload) {
    return this.authService.refresh(user.sub, dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sub);
  }
}
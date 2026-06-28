// src/auth/auth.service.ts
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: number;
  type: UserType;
  centerIds?: number[];
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(nationalCode: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { nationalCode },
      include: {
        centerAssignments: {
          where: { revokedAt: null },
          select: { centerId: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('نام کاربری یا رمز عبور اشتباه است');
    }

    // پیام مجزا برای کاربران غیرمجاز (canLogin=false)
    if (!user.canLogin) {
      throw new ForbiddenException('دسترسی ورود برای این کاربر توسط مدیر سیستم غیرفعال شده است');
    }

    const loginAllowed: UserType[] = [UserType.SUPERUSER, UserType.CENTER_MANAGER];
    if (!loginAllowed.includes(user.userType)) {
      throw new ForbiddenException('دسترسی به این سامانه برای شما مجاز نیست');
    }

    const valid = await bcrypt.compare(password, user.passwordHash ?? '');
    if (!valid) {
      throw new UnauthorizedException('نام کاربری یا رمز عبور اشتباه است');
    }

    const centerIds = user.centerAssignments.map((a) => a.centerId);
    return this.generateTokens(user.id, user.userType, centerIds);
  }

  async refresh(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshToken) throw new UnauthorizedException('توکن منقضی شده است');

    // بررسی canLogin — اگه بعد از صدور توکن دسترسی قطع شده باشد
    if (!user.canLogin || !user.isActive) {
      await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
      throw new ForbiddenException('دسترسی ورود برای این کاربر غیرفعال شده است');
    }

    const match = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!match) throw new UnauthorizedException('توکن منقضی شده است');

    const centerIds = await this.prisma.userCenterAssignment
      .findMany({ where: { userId, revokedAt: null }, select: { centerId: true } })
      .then((r) => r.map((a) => a.centerId));

    return this.generateTokens(user.id, user.userType, centerIds);
  }

  async logout(userId: number) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
  }

  private async generateTokens(userId: number, type: UserType, centerIds: number[]) {
    const payload: JwtPayload = { sub: userId, type, centerIds };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.generateRandomToken();
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: hash } });

    return { accessToken, refreshToken, userType: type, centerIds };
  }

  private generateRandomToken(length = 64): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}

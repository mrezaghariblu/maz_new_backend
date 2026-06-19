import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserType } from '@prisma/client';
import type { JwtPayload } from '../auth.service';

@Injectable()
export class CenterScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user: JwtPayload = req.user;

    if (user.type === UserType.SUPERUSER) return true;

    const centerId = Number(
      req.params.centerId ?? req.body.centerId ?? req.query.centerId,
    );
    if (!centerId) return true;

    return user.centerIds?.includes(centerId) ?? false;
  }
}

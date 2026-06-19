import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { JwtPayload } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';

export const AUDIT_ENTITY_KEY = 'audit_entity';
export const AUDIT_ACTION_KEY = 'audit_action';

export const AuditEntity = (entity: string) =>
  SetMetadata(AUDIT_ENTITY_KEY, entity);
export const AuditAction = (action: string) =>
  SetMetadata(AUDIT_ACTION_KEY, action);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entity = this.reflector.get<string>(
      AUDIT_ENTITY_KEY,
      context.getHandler(),
    );
    const action = this.reflector.get<string>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );
    if (!entity || !action) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;

    return next.handle().pipe(
      tap((result) => {
        if (!user?.sub) return;

        const entityId =
          (result as { id?: number })?.id ?? Number(req.params?.id) ?? 0;

        void this.prisma.auditLog.create({
          data: {
            performedById: user.sub,
            entity,
            entityId,
            action,
            afterData:
              action === 'DELETE'
                ? undefined
                : (result as object | undefined),
            ipAddress: req.ip as string | undefined,
          },
        });
      }),
    );
  }
}

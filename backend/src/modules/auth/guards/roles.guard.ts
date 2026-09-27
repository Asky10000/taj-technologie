import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role, ROLE_HIERARCHY } from '../enums/role.enum';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const hasAccess = required.some(
      (r) => user.role === r || userLevel >= (ROLE_HIERARCHY[r] ?? 0),
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `Accès refusé : rôle ${user.role} insuffisant — requis : ${required.join(', ')}`,
      );
    }
    return true;
  }
}

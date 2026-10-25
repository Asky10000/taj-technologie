import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role } from '../enums/role.enum';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

/**
 * Contrôle d'accès par module, par utilisateur.
 *
 * - Les routes publiques, et les segments transverses (auth, health, uploads,
 *   payments) ne sont jamais filtrés.
 * - ADMIN / SUPER_ADMIN ont accès à tout.
 * - Un utilisateur dont `allowedModules` est null/undefined n'a AUCUNE
 *   restriction (rétro-compatibilité : les comptes existants ne sont pas bloqués).
 * - Sinon, le module déduit du chemin doit figurer dans `allowedModules`,
 *   faute de quoi une 403 « Accès non autorisé » est renvoyée.
 */
const EXEMPT_SEGMENTS = new Set(['auth', 'health', 'uploads', 'payments']);

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = req.user;

    // Pas d'utilisateur résolu → laissé aux gardes d'authentification.
    if (!user) return true;
    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) return true;
    // null/undefined = aucune restriction (comptes existants).
    if (user.allowedModules == null) return true;

    const moduleKey = this.extractModule(req);
    if (!moduleKey || EXEMPT_SEGMENTS.has(moduleKey)) return true;

    if (!user.allowedModules.includes(moduleKey)) {
      throw new ForbiddenException(
        `Accès non autorisé au module « ${moduleKey} »`,
      );
    }
    return true;
  }

  private extractModule(req: {
    path?: string;
    originalUrl?: string;
    url?: string;
  }): string {
    const raw = req.path ?? req.originalUrl ?? req.url ?? '';
    const parts = raw.split('?')[0].split('/').filter(Boolean); // ['api','v1','suppliers',...]
    const vIdx = parts.findIndex((p) => /^v\d+$/.test(p));
    const seg = vIdx >= 0 ? parts[vIdx + 1] : parts[0];
    return (seg ?? '').toLowerCase();
  }
}

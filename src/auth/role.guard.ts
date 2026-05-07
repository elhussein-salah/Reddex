import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from 'src/enums';
import { AuthenticatedRequest } from 'src/common/interfaces/AuthenticatedRequest';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    const userRole = user.role;
    const isAllowed =
      requiredRoles.includes(userRole) ||
      (userRole === Role.SUPER_ADMIN && requiredRoles.includes(Role.ADMIN));

    if (!isAllowed) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}

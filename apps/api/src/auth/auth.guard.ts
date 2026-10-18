import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  type CanActivate,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { Role, User } from "../../.generated/client/client";
import { AuthService } from "./auth.service";
export const Public = () => SetMetadata("public", true);
export const Roles = (...roles: Role[]) => SetMetadata("roles", roles);
export interface Identity {
  user: User;
  sessionId: string;
}
export type AuthRequest = Request & { identity?: Identity };
export const CurrentIdentity = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Identity => {
    const identity = context.switchToHttp().getRequest<AuthRequest>().identity;
    if (!identity) throw new ForbiddenException();
    return identity;
  },
);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>("public", [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.identity = await this.auth.authenticate(request.headers.authorization);
    const roles = this.reflector.getAllAndOverride<Role[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(request.identity.user.role)) throw new ForbiddenException();
    return true;
  }
}

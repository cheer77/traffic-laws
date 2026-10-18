import { createHash, randomBytes } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { API_CONFIG, type ApiConfig } from "../config/config";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./password";
import type { CredentialsDto } from "./auth.dto";
import type { User } from "../../.generated/client/client";
export const publicProfile = (user: User) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
});
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}
  async register(input: CredentialsDto) {
    const passwordHash = await hashPassword(input.password);
    // Database uniqueness handles concurrent registrations; role is never copied from input.
    const user = await this.db.user.create({
      data: { email: input.email, passwordHash, role: "student" },
    });
    return publicProfile(user);
  }
  async login(input: CredentialsDto) {
    const user = await this.db.user.findUnique({ where: { email: input.email } });
    const valid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !valid || user.status !== "active") throw new UnauthorizedException();
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + this.config.sessionTtlSeconds * 1000);
    await this.db.session.create({
      data: { userId: user.id, tokenHash: tokenHash(token), expiresAt },
    });
    return { accessToken: token, tokenType: "Bearer", expiresAt };
  }
  async authenticate(header: string | undefined) {
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header ?? "");
    if (!match) throw new UnauthorizedException();
    const session = await this.db.session.findUnique({
      where: { tokenHash: tokenHash(match[1]) },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.status !== "active"
    )
      throw new UnauthorizedException();
    return { user: session.user, sessionId: session.id };
  }
  async logout(sessionId: string) {
    await this.db.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }
  async bootstrap(input: CredentialsDto) {
    const [operator] = await this.db.$queryRaw<
      Array<{ allowed: boolean }>
    >`SELECT has_table_privilege(current_user, '"Publication"', 'INSERT') AS allowed`;
    if (!operator.allowed) throw new ForbiddenException();
    const passwordHash = await hashPassword(input.password);
    return this.db.$transaction(async (tx) => {
      // Serialize bootstrap attempts and refuse to promote an existing public account.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(610017)::text`;
      if (await tx.user.count({ where: { role: "admin" } })) throw new ConflictException();
      const user = await tx.user.create({
        data: { email: input.email, passwordHash, role: "admin" },
      });
      await tx.auditEvent.create({
        data: { actorId: user.id, action: "admin.bootstrap", subject: user.id },
      });
      return publicProfile(user);
    });
  }
}

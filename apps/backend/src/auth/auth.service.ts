import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto, context: { ip?: string; userAgent?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException("An account with this email already exists.");

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        phone: dto.phone,
        preference: { create: {} },
        subscription: { create: {} },
      },
    });

    await this.audit.log({ userId: user.id, action: "REGISTER", resourceType: "user", resourceId: user.id, ip: context.ip });

    const tokens = await this.issueTokens(user.id, user.email, user.role, context);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto, context: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || user.deletedAt) throw new UnauthorizedException("Invalid email or password.");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid email or password.");
    if (user.status !== "ACTIVE") throw new UnauthorizedException("Account is not active.");

    await this.audit.log({ userId: user.id, action: "LOGIN", resourceType: "user", resourceId: user.id, ip: context.ip });

    const tokens = await this.issueTokens(user.id, user.email, user.role, context);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string, context: { ip?: string; userAgent?: string }) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>("jwt.refreshSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    const tokenHash = hashToken(refreshToken);
    const session = await this.prisma.userSession.findFirst({
      where: { userId: payload.sub, refreshTokenHash: tokenHash, revokedAt: null },
    });
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Session expired or revoked. Please log in again.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active.");
    }

    // Rotate: revoke the used refresh token, issue a fresh pair.
    await this.prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const tokens = await this.issueTokens(user.id, user.email, user.role, context);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.userSession.updateMany({
      where: { userId, refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { loggedOut: true };
  }

  async listSessions(userId: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
    });
    return sessions;
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preference: true, subscription: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.toPublicUser(user);
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
    context: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("jwt.accessSecret"),
      expiresIn: this.config.get<string>("jwt.accessTtl"),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("jwt.refreshSecret"),
      expiresIn: this.config.get<string>("jwt.refreshTtl"),
    });

    const refreshTtlDays = parseTtlToDays(this.config.get<string>("jwt.refreshTtl") ?? "30d");
    await this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash: hashToken(refreshToken),
        userAgent: context.userAgent,
        ipAddress: context.ip,
        expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: string;
    status: string;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseTtlToDays(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) return 30;
  const value = Number(match[1]);
  const unit = match[2];
  const perDay: Record<string, number> = { s: 86400, m: 1440, h: 24, d: 1 };
  return value / perDay[unit];
}

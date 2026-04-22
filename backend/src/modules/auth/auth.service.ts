import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserStatus } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  JwtPayload,
  TokenPair,
  AuthenticatedUser,
} from './interfaces/jwt-payload.interface';
import { Role } from './enums/role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds: number;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  }

  // ─────────────────────────────────────────────────────────────
  // INSCRIPTION
  // ─────────────────────────────────────────────────────────────
  async register(dto: RegisterDto, requesterRole?: Role): Promise<{
    user: Partial<User>;
    tokens: TokenPair;
  }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    // Seul un ADMIN/SUPER_ADMIN peut créer un autre admin
    let role = dto.role ?? Role.USER;
    if (
      (role === Role.ADMIN || role === Role.SUPER_ADMIN) &&
      requesterRole !== Role.SUPER_ADMIN &&
      requesterRole !== Role.ADMIN
    ) {
      role = Role.USER;
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role,
      status: UserStatus.ACTIVE,
    });
    const saved = await this.userRepo.save(user);

    this.logger.log(`Nouvel utilisateur enregistré : ${saved.email} (${saved.role})`);
    const tokens = await this.generateTokens(saved);
    return { user: this.sanitize(saved), tokens };
  }

  // ─────────────────────────────────────────────────────────────
  // CONNEXION
  // ─────────────────────────────────────────────────────────────
  async login(
    dto: LoginDto,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ user: Partial<User>; tokens: TokenPair }> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'passwordHash', 'firstName', 'lastName', 'role', 'status'],
    });
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Compte inactif ou suspendu');
    }

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const tokens = await this.generateTokens(user, meta);
    this.logger.log(`Connexion réussie : ${user.email}`);
    return { user: this.sanitize(user), tokens };
  }

  // ─────────────────────────────────────────────────────────────
  // REFRESH — token rotation
  // ─────────────────────────────────────────────────────────────
  async refresh(userId: string, refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash, userId },
      relations: ['user'],
    });
    if (!stored || !stored.isActive()) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    // Rotation : révocation de l'ancien token
    stored.revokedAt = new Date();
    await this.refreshTokenRepo.save(stored);

    return this.generateTokens(stored.user);
  }

  // ─────────────────────────────────────────────────────────────
  // LOGOUT — révocation du refresh token courant
  // ─────────────────────────────────────────────────────────────
  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepo.update(
      { tokenHash, userId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CHANGE PASSWORD
  // ─────────────────────────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'passwordHash'],
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Mot de passe actuel incorrect');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit être différent de l\'ancien',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);
    await this.userRepo.update(userId, { passwordHash });

    // Sécurité : révoque toutes les sessions en cours
    await this.logoutAll(userId);
    this.logger.log(`Mot de passe modifié pour l'utilisateur ${userId}`);
  }

  // ─────────────────────────────────────────────────────────────
  // PROFIL COURANT
  // ─────────────────────────────────────────────────────────────
  async getProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return this.sanitize(user);
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS PRIVÉS
  // ─────────────────────────────────────────────────────────────
  private async generateTokens(
    user: Pick<User, 'id' | 'email' | 'role'>,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    const basePayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessExpiry = this.configService.get<string>('jwt.accessExpiry');
    const refreshExpiry = this.configService.get<string>('jwt.refreshExpiry');

    const accessToken = await this.jwtService.signAsync(
      { ...basePayload, type: 'access' },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: accessExpiry,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...basePayload, type: 'refresh' },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiry,
      },
    );

    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + this.parseExpiry(refreshExpiry)),
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      }),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(this.parseExpiry(accessExpiry) / 1000),
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) return 15 * 60 * 1000;
    const [, num, unit] = match;
    const n = parseInt(num, 10);
    switch (unit) {
      case 's': return n * 1000;
      case 'm': return n * 60 * 1000;
      case 'h': return n * 60 * 60 * 1000;
      case 'd': return n * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000;
    }
  }

  private sanitize(user: User | Partial<User>): Partial<User> {
    const { passwordHash, refreshTokens, ...rest } = user as User;
    return rest;
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITAIRE (pour JwtStrategy / guards)
  // ─────────────────────────────────────────────────────────────
  async validateUserById(id: string): Promise<AuthenticatedUser> {
    const user = await this.userRepo.findOne({
      where: { id },
      select: ['id', 'email', 'role', 'status'],
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Utilisateur non autorisé');
    }
    return { id: user.id, email: user.email, role: user.role };
  }

  /**
   * Tâche de maintenance : suppression des refresh tokens expirés ou révoqués.
   * À câbler plus tard sur un @Cron.
   */
  async cleanupExpiredRefreshTokens(): Promise<number> {
    const result = await this.refreshTokenRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }
}

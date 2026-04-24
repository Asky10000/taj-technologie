import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from './entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { LoginHistory } from '../auth/entities/login-history.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { Role, ROLE_HIERARCHY } from '../auth/enums/role.enum';
import { paginate } from '../../common/utils/pagination.util';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly saltRounds: number;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(LoginHistory)
    private readonly loginHistoryRepo: Repository<LoginHistory>,
  ) {
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────
  async create(dto: CreateUserDto, requester: { id: string; role: Role }): Promise<User> {
    this.ensureCanAssignRole(requester.role, dto.role ?? Role.USER);

    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email déjà utilisé');

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role ?? Role.USER,
      status: dto.status ?? UserStatus.ACTIVE,
      avatarUrl: dto.avatarUrl,
    });
    const saved = await this.userRepo.save(user);
    this.logger.log(`Utilisateur créé : ${saved.email} par ${requester.id}`);
    return saved;
  }

  // ─────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────
  async findAll(query: QueryUsersDto): Promise<PaginatedResult<User>> {
    const qb = this.userRepo.createQueryBuilder('user');

    if (query.role) qb.andWhere('user.role = :role', { role: query.role });
    if (query.status) qb.andWhere('user.status = :status', { status: query.status });

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('user.email ILIKE :q', { q: `%${query.search}%` })
            .orWhere('user.firstName ILIKE :q', { q: `%${query.search}%` })
            .orWhere('user.lastName ILIKE :q', { q: `%${query.search}%` })
            .orWhere('user.phone ILIKE :q', { q: `%${query.search}%` });
        }),
      );
    }

    return paginate(qb, query);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────
  async update(
    id: string,
    dto: UpdateUserDto,
    requester: { id: string; role: Role },
  ): Promise<User> {
    const user = await this.findOne(id);

    // Un utilisateur ne peut pas modifier quelqu'un de rang égal ou supérieur
    // (sauf lui-même, et sauf SUPER_ADMIN)
    if (requester.id !== user.id) {
      this.ensureCanManage(requester.role, user.role);
      if (dto.role) this.ensureCanAssignRole(requester.role, dto.role);
    } else if (dto.role && dto.role !== user.role) {
      throw new ForbiddenException(
        'Vous ne pouvez pas modifier votre propre rôle',
      );
    }

    if (dto.email && dto.email !== user.email) {
      const clash = await this.userRepo.findOne({ where: { email: dto.email } });
      if (clash) throw new ConflictException('Email déjà utilisé');
    }

    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);
    this.logger.log(`Utilisateur ${id} mis à jour par ${requester.id}`);
    return saved;
  }

  async updateRole(
    id: string,
    role: Role,
    requester: { id: string; role: Role },
  ): Promise<User> {
    if (id === requester.id) {
      throw new ForbiddenException('Vous ne pouvez pas modifier votre propre rôle');
    }
    const user = await this.findOne(id);
    this.ensureCanManage(requester.role, user.role);
    this.ensureCanAssignRole(requester.role, role);

    user.role = role;
    const saved = await this.userRepo.save(user);
    // Invalide les sessions pour que le nouveau rôle soit pris en compte
    await this.refreshTokenRepo.update(
      { userId: id, revokedAt: IsNull() as any },
      { revokedAt: new Date() },
    );
    this.logger.log(`Rôle de ${id} changé en ${role} par ${requester.id}`);
    return saved;
  }

  async updateStatus(
    id: string,
    status: UserStatus,
    requester: { id: string; role: Role },
  ): Promise<User> {
    if (id === requester.id && status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Vous ne pouvez pas désactiver votre propre compte');
    }
    const user = await this.findOne(id);
    this.ensureCanManage(requester.role, user.role);

    user.status = status;
    const saved = await this.userRepo.save(user);

    if (status !== UserStatus.ACTIVE) {
      await this.refreshTokenRepo.update(
        { userId: id, revokedAt: IsNull() as any },
        { revokedAt: new Date() },
      );
    }
    this.logger.log(`Statut de ${id} changé en ${status} par ${requester.id}`);
    return saved;
  }

  async resetPassword(
    id: string,
    newPassword: string,
    requester: { id: string; role: Role },
  ): Promise<void> {
    const user = await this.findOne(id);
    if (requester.id !== user.id) {
      this.ensureCanManage(requester.role, user.role);
    }

    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
    await this.userRepo.update(id, { passwordHash });
    await this.refreshTokenRepo.update(
      { userId: id, revokedAt: IsNull() as any },
      { revokedAt: new Date() },
    );
    this.logger.log(`Mot de passe réinitialisé pour ${id} par ${requester.id}`);
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE (soft delete)
  // ─────────────────────────────────────────────────────────────
  async remove(id: string, requester: { id: string; role: Role }): Promise<void> {
    if (id === requester.id) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte');
    }
    const user = await this.findOne(id);
    this.ensureCanManage(requester.role, user.role);

    await this.refreshTokenRepo.update(
      { userId: id, revokedAt: IsNull() as any },
      { revokedAt: new Date() },
    );
    await this.userRepo.softRemove(user);
    this.logger.log(`Utilisateur ${id} supprimé (soft) par ${requester.id}`);
  }

  async restore(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable`);
    if (!user.deletedAt) {
      throw new BadRequestException('Cet utilisateur n\'est pas supprimé');
    }
    await this.userRepo.restore(id);
    this.logger.log(`Utilisateur ${id} restauré`);
    return this.findOne(id);
  }

  // ─────────────────────────────────────────────────────────────
  // RBAC HELPERS
  // ─────────────────────────────────────────────────────────────
  private ensureCanManage(requesterRole: Role, targetRole: Role): void {
    const reqLvl = ROLE_HIERARCHY[requesterRole] ?? 0;
    const tgtLvl = ROLE_HIERARCHY[targetRole] ?? 0;
    if (reqLvl <= tgtLvl) {
      throw new ForbiddenException(
        `Rôle ${requesterRole} insuffisant pour gérer un utilisateur ${targetRole}`,
      );
    }
  }

  private ensureCanAssignRole(requesterRole: Role, targetRole: Role): void {
    const reqLvl = ROLE_HIERARCHY[requesterRole] ?? 0;
    const tgtLvl = ROLE_HIERARCHY[targetRole] ?? 0;
    // On ne peut pas attribuer un rôle égal ou supérieur au sien
    if (reqLvl <= tgtLvl && requesterRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        `Vous ne pouvez pas attribuer le rôle ${targetRole}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LOGIN HISTORY
  // ─────────────────────────────────────────────────────────────
  async getLoginHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: LoginHistory[]; total: number; page: number; totalPages: number }> {
    await this.findOne(userId); // vérifie que l'utilisateur existe

    const [items, total] = await this.loginHistoryRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────────────────
  async countByRole(): Promise<Record<Role, number>> {
    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select('u.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.role')
      .getRawMany<{ role: Role; count: string }>();

    const result = {} as Record<Role, number>;
    for (const r of Object.values(Role)) result[r] = 0;
    rows.forEach((r) => (result[r.role] = parseInt(r.count, 10)));
    return result;
  }
}

import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets, IsNull, Not } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto, UpdateTicketStatusDto, AssignTicketDto, EscalateTicketDto, SatisfactionDto } from './dto/update-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import {
  TicketStatus, TicketPriority,
  SLA_RESPONSE_MINUTES, SLA_RESOLUTION_MINUTES,
} from './enums/ticket.enums';
import { Role } from '../auth/enums/role.enum';
import { paginate } from '../../common/utils/pagination.util';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  // Transitions de statut autorisées
  private readonly ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    [TicketStatus.OPEN]: [
      TicketStatus.IN_PROGRESS, TicketStatus.PENDING_CLIENT,
      TicketStatus.ESCALATED, TicketStatus.CANCELLED,
    ],
    [TicketStatus.IN_PROGRESS]: [
      TicketStatus.PENDING_CLIENT, TicketStatus.PENDING_SUPPLIER,
      TicketStatus.ESCALATED, TicketStatus.RESOLVED,
    ],
    [TicketStatus.PENDING_CLIENT]: [
      TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED,
    ],
    [TicketStatus.PENDING_SUPPLIER]: [
      TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED,
    ],
    [TicketStatus.ESCALATED]: [
      TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED,
    ],
    [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.OPEN],
    [TicketStatus.CLOSED]: [],
    [TicketStatus.CANCELLED]: [],
  };

  constructor(
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketComment) private readonly commentRepo: Repository<TicketComment>,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────
  async create(dto: CreateTicketDto, createdById: string): Promise<Ticket> {
    const ticket = this.ticketRepo.create({
      ...dto,
      tags: dto.tags ?? [],
      priority: dto.priority ?? TicketPriority.MEDIUM,
      createdById,
      status: TicketStatus.OPEN,
    });
    const saved = await this.ticketRepo.save(ticket);
    this.logger.log(`Ticket créé : ${saved.number} [${saved.priority}]`);
    return this.findOne(saved.id);
  }

  async findAll(
    query: QueryTicketsDto,
    user: { id: string; role: Role },
  ): Promise<PaginatedResult<Ticket>> {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.customer', 'customer')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('t.createdBy', 'createdBy');

    // Un technicien ne voit que ses tickets assignés
    if (user.role === Role.TECHNICIAN) {
      qb.andWhere('t.assignedToId = :uid', { uid: user.id });
    }

    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.priority) qb.andWhere('t.priority = :priority', { priority: query.priority });
    if (query.category) qb.andWhere('t.category = :category', { category: query.category });
    if (query.customerId) qb.andWhere('t.customerId = :cid', { cid: query.customerId });
    if (query.assignedToId) qb.andWhere('t.assignedToId = :aid', { aid: query.assignedToId });
    if (query.unassigned) qb.andWhere('t.assignedToId IS NULL');

    if (query.slaBreached) {
      const now = new Date();
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('t.slaResolutionDueAt < :now AND t.resolvedAt IS NULL', { now })
            .orWhere('t.slaResponseDueAt < :now AND t.firstResponseAt IS NULL', { now });
        }),
      );
    }

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('t.number ILIKE :q', { q: `%${query.search}%` })
            .orWhere('t.title ILIKE :q', { q: `%${query.search}%` })
            .orWhere('t.description ILIKE :q', { q: `%${query.search}%` })
            .orWhere('customer.name ILIKE :q', { q: `%${query.search}%` });
        }),
      );
    }
    return paginate(qb, query);
  }

  async findOne(id: string): Promise<Ticket> {
    const t = await this.ticketRepo.findOne({
      where: { id },
      relations: [
        'customer', 'contact', 'assignedTo', 'createdBy',
        'escalatedTo', 'comments', 'comments.author',
      ],
    });
    if (!t) throw new NotFoundException(`Ticket ${id} introuvable`);
    return t;
  }

  async update(id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);
    if ([TicketStatus.CLOSED, TicketStatus.CANCELLED].includes(ticket.status)) {
      throw new BadRequestException('Un ticket fermé/annulé ne peut être modifié');
    }
    if (dto.priority && dto.priority !== ticket.priority) {
      // Recalcul SLA si priorité change
      const now = new Date();
      ticket.slaResponseDueAt = new Date(
        now.getTime() + SLA_RESPONSE_MINUTES[dto.priority] * 60000,
      );
      ticket.slaResolutionDueAt = new Date(
        now.getTime() + SLA_RESOLUTION_MINUTES[dto.priority] * 60000,
      );
    }
    Object.assign(ticket, { ...dto, tags: dto.tags ?? ticket.tags });
    return this.ticketRepo.save(ticket);
  }

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW
  // ─────────────────────────────────────────────────────────────
  async updateStatus(id: string, dto: UpdateTicketStatusDto, userId: string): Promise<Ticket> {
    const ticket = await this.findOne(id);
    const allowed = this.ALLOWED_TRANSITIONS[ticket.status];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition ${ticket.status} → ${dto.status} non autorisée`,
      );
    }
    if (
      [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(dto.status) &&
      !dto.resolutionNotes
    ) {
      throw new BadRequestException('Les notes de résolution sont requises');
    }

    ticket.status = dto.status;
    if (dto.resolutionNotes) ticket.resolutionNotes = dto.resolutionNotes;
    if (dto.timeSpentMinutes !== undefined) {
      ticket.timeSpentMinutes = (ticket.timeSpentMinutes ?? 0) + dto.timeSpentMinutes;
    }

    const now = new Date();
    if (dto.status === TicketStatus.RESOLVED) ticket.resolvedAt = now;
    if (dto.status === TicketStatus.CLOSED) ticket.closedAt = now;
    if (dto.status === TicketStatus.OPEN && ticket.resolvedAt) ticket.resolvedAt = undefined;

    return this.ticketRepo.save(ticket);
  }

  async assign(id: string, dto: AssignTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);
    ticket.assignedToId = dto.assignedToId;
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }
    return this.ticketRepo.save(ticket);
  }

  async escalate(id: string, dto: EscalateTicketDto, userId: string): Promise<Ticket> {
    const ticket = await this.findOne(id);
    ticket.status = TicketStatus.ESCALATED;
    ticket.escalatedToId = dto.escalatedToId;
    ticket.escalatedAt = new Date();

    // Ajout d'un commentaire interne automatique
    await this.commentRepo.save(
      this.commentRepo.create({
        ticketId: id,
        content: `Ticket escaladé${dto.reason ? ` : ${dto.reason}` : ''}`,
        isInternal: true,
        authorId: userId,
        attachments: [],
        timeSpentMinutes: 0,
      }),
    );
    return this.ticketRepo.save(ticket);
  }

  async recordSatisfaction(id: string, dto: SatisfactionDto): Promise<Ticket> {
    const ticket = await this.findOne(id);
    if (![TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(ticket.status)) {
      throw new BadRequestException('La satisfaction ne peut être notée que sur un ticket résolu');
    }
    ticket.satisfactionScore = dto.score;
    ticket.satisfactionComment = dto.comment;
    return this.ticketRepo.save(ticket);
  }

  // ─────────────────────────────────────────────────────────────
  // COMMENTAIRES
  // ─────────────────────────────────────────────────────────────
  async addComment(
    ticketId: string,
    dto: CreateCommentDto,
    authorId: string,
    userRole: Role,
  ): Promise<TicketComment> {
    const ticket = await this.findOne(ticketId);
    if ([TicketStatus.CLOSED, TicketStatus.CANCELLED].includes(ticket.status)) {
      throw new BadRequestException('Impossible d\'ajouter un commentaire sur un ticket fermé');
    }

    // Seuls les techniciens/managers peuvent poster des notes internes
    if (dto.isInternal && user_cannot_post_internal(userRole)) {
      throw new ForbiddenException('Seul un technicien peut poster une note interne');
    }

    return this.dataSource.transaction(async (manager) => {
      const comment = manager.create(TicketComment, {
        ticketId,
        content: dto.content,
        isInternal: dto.isInternal ?? false,
        timeSpentMinutes: dto.timeSpentMinutes ?? 0,
        attachments: dto.attachments ?? [],
        authorId,
        isFirstResponse: false,
      });

      // Marquer la première réponse officielle
      if (!ticket.firstResponseAt && !dto.isInternal) {
        comment.isFirstResponse = true;
        await manager.update(Ticket, ticketId, { firstResponseAt: new Date() });
        ticket.firstResponseAt = new Date();
      }

      // Cumuler le temps passé sur le ticket
      if (dto.timeSpentMinutes) {
        await manager.increment(Ticket, { id: ticketId }, 'timeSpentMinutes', dto.timeSpentMinutes);
      }

      // Si technicien répond → ticket passe IN_PROGRESS automatiquement
      if (
        ticket.status === TicketStatus.OPEN ||
        ticket.status === TicketStatus.PENDING_CLIENT
      ) {
        await manager.update(Ticket, ticketId, { status: TicketStatus.IN_PROGRESS });
      }

      return manager.save(comment);
    });
  }

  async findComments(ticketId: string, includeInternal: boolean): Promise<TicketComment[]> {
    await this.findOne(ticketId);
    const qb = this.commentRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.author', 'author')
      .where('c.ticketId = :ticketId', { ticketId });

    if (!includeInternal) qb.andWhere('c.isInternal = false');

    return qb.orderBy('c.createdAt', 'ASC').getMany();
  }

  async deleteComment(commentId: string, requesterId: string, requesterRole: Role): Promise<void> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException(`Commentaire ${commentId} introuvable`);
    if (comment.authorId !== requesterId && requesterRole !== Role.ADMIN && requesterRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres commentaires');
    }
    await this.commentRepo.softRemove(comment);
  }

  // ─────────────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────────────
  async getStats(): Promise<{
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    avgResolutionMinutes: number;
    slaComplianceRate: number;
  }> {
    const [byStatus, byPriority, resolved] = await Promise.all([
      this.ticketRepo
        .createQueryBuilder('t')
        .select('t.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('t.status')
        .getRawMany<{ status: string; count: string }>(),

      this.ticketRepo
        .createQueryBuilder('t')
        .select('t.priority', 'priority')
        .addSelect('COUNT(*)', 'count')
        .groupBy('t.priority')
        .getRawMany<{ priority: string; count: string }>(),

      this.ticketRepo
        .createQueryBuilder('t')
        .select('AVG(EXTRACT(EPOCH FROM (t.resolvedAt - t.createdAt)) / 60)', 'avgMinutes')
        .addSelect(
          'SUM(CASE WHEN t.resolvedAt <= t.slaResolutionDueAt THEN 1 ELSE 0 END)',
          'slaOk',
        )
        .addSelect('COUNT(*)', 'total')
        .where('t.resolvedAt IS NOT NULL')
        .getRawOne<{ avgMinutes: string; slaOk: string; total: string }>(),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((r) => (statusMap[r.status] = parseInt(r.count, 10)));

    const priorityMap: Record<string, number> = {};
    byPriority.forEach((r) => (priorityMap[r.priority] = parseInt(r.count, 10)));

    const total = parseInt(resolved?.total ?? '0', 10);
    const slaOk = parseInt(resolved?.slaOk ?? '0', 10);

    return {
      byStatus: statusMap,
      byPriority: priorityMap,
      avgResolutionMinutes: Math.round(parseFloat(resolved?.avgMinutes ?? '0')),
      slaComplianceRate: total > 0 ? Math.round((slaOk / total) * 100) : 0,
    };
  }
}

// Helper local
function user_cannot_post_internal(role: Role): boolean {
  return ![
    Role.TECHNICIAN, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN,
  ].includes(role);
}

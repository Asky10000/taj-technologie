import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectTask } from './entities/project-task.entity';
import { TimeEntry } from './entities/time-entry.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  UpdateProjectDto,
  UpdateProjectStatusDto,
  AddMemberDto,
  UpdateProgressDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateTimeEntryDto,
  UpdateTimeEntryDto,
} from './dto/project-actions.dto';
import { ProjectStatus, TaskStatus, MemberRole } from './enums/project.enums';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/pagination.util';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../auth/enums/role.enum';

const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.DRAFT]:     [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.ACTIVE]:    [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  [ProjectStatus.ON_HOLD]:   [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.COMPLETED]: [],
  [ProjectStatus.CANCELLED]: [],
};

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(ProjectTask)
    private readonly taskRepo: Repository<ProjectTask>,
    @InjectRepository(TimeEntry)
    private readonly timeEntryRepo: Repository<TimeEntry>,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // PROJECTS
  // ─────────────────────────────────────────────────────────────

  async create(dto: CreateProjectDto, currentUser: AuthenticatedUser): Promise<Project> {
    const project = this.projectRepo.create({
      ...dto,
      tags: dto.tags ?? [],
      managerId: dto.managerId ?? currentUser.sub,
    });
    const saved = await this.projectRepo.save(project);
    this.logger.log(`Projet créé : ${saved.code} — ${saved.name}`);
    return saved;
  }

  async findAll(query: PaginationDto): Promise<PaginatedResult<Project>> {
    const qb = this.projectRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.customer', 'customer')
      .leftJoinAndSelect('p.manager', 'manager');

    if (query.search) {
      qb.andWhere(
        '(p.code ILIKE :q OR p.name ILIKE :q OR p.description ILIKE :q)',
        { q: `%${query.search}%` },
      );
    }

    qb.orderBy('p.createdAt', 'DESC');
    return paginate(qb, query);
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['customer', 'manager', 'members', 'members.user', 'tasks'],
    });
    if (!project) throw new NotFoundException(`Projet ${id} introuvable`);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async updateStatus(
    id: string,
    dto: UpdateProjectStatusDto,
  ): Promise<Project> {
    const project = await this.findOne(id);
    const allowed = PROJECT_STATUS_TRANSITIONS[project.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition ${project.status} → ${dto.status} non autorisée`,
      );
    }
    project.status = dto.status;
    if (dto.status === ProjectStatus.ACTIVE && !project.actualStartDate) {
      project.actualStartDate = new Date() as any;
    }
    if (dto.status === ProjectStatus.COMPLETED && !project.actualEndDate) {
      project.actualEndDate = new Date() as any;
    }
    return this.projectRepo.save(project);
  }

  async updateProgress(id: string, dto: UpdateProgressDto): Promise<Project> {
    const project = await this.findOne(id);
    project.progressPercent = dto.progressPercent;
    return this.projectRepo.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    if (project.status === ProjectStatus.ACTIVE) {
      throw new BadRequestException(
        'Impossible de supprimer un projet actif. Annulez-le d\'abord.',
      );
    }
    await this.projectRepo.softRemove(project);
    this.logger.log(`Projet ${project.code} supprimé (soft)`);
  }

  // ─────────────────────────────────────────────────────────────
  // MEMBRES
  // ─────────────────────────────────────────────────────────────

  async addMember(projectId: string, dto: AddMemberDto): Promise<ProjectMember> {
    await this.findOne(projectId);

    const exists = await this.memberRepo.findOne({
      where: { projectId, userId: dto.userId },
    });
    if (exists) throw new ConflictException('Cet utilisateur est déjà membre du projet');

    const member = this.memberRepo.create({
      projectId,
      userId: dto.userId,
      role: dto.role ?? MemberRole.TECHNICIAN,
      hourlyRate: dto.hourlyRate,
    });
    return this.memberRepo.save(member);
  }

  async updateMember(
    projectId: string,
    memberId: string,
    dto: Partial<AddMemberDto>,
  ): Promise<ProjectMember> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, projectId },
    });
    if (!member) throw new NotFoundException(`Membre ${memberId} introuvable`);
    Object.assign(member, dto);
    return this.memberRepo.save(member);
  }

  async removeMember(projectId: string, memberId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, projectId },
    });
    if (!member) throw new NotFoundException(`Membre ${memberId} introuvable`);
    await this.memberRepo.remove(member);
  }

  // ─────────────────────────────────────────────────────────────
  // TÂCHES
  // ─────────────────────────────────────────────────────────────

  async createTask(
    projectId: string,
    dto: CreateTaskDto,
  ): Promise<ProjectTask> {
    await this.findOne(projectId);

    if (dto.parentTaskId) {
      const parent = await this.taskRepo.findOne({
        where: { id: dto.parentTaskId, projectId },
      });
      if (!parent) throw new NotFoundException(`Tâche parente ${dto.parentTaskId} introuvable`);
    }

    const task = this.taskRepo.create({ ...dto, projectId });
    return this.taskRepo.save(task);
  }

  async findTasks(projectId: string): Promise<ProjectTask[]> {
    return this.taskRepo.find({
      where: { projectId },
      relations: ['assignee', 'subTasks'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOneTask(projectId: string, taskId: string): Promise<ProjectTask> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, projectId },
      relations: ['assignee', 'subTasks', 'timeEntries', 'timeEntries.user'],
    });
    if (!task) throw new NotFoundException(`Tâche ${taskId} introuvable`);
    return task;
  }

  async updateTask(
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<ProjectTask> {
    const task = await this.findOneTask(projectId, taskId);
    const wasCompleted = task.status === TaskStatus.DONE;

    Object.assign(task, dto);

    if (dto.status === TaskStatus.DONE && !wasCompleted) {
      task.completedAt = new Date();
      task.progressPercent = 100;
    }
    if (dto.status && dto.status !== TaskStatus.DONE && wasCompleted) {
      task.completedAt = undefined;
    }

    const saved = await this.taskRepo.save(task);
    // Recalculer la progression du projet depuis les tâches racines
    await this.recalculateProjectProgress(projectId);
    return saved;
  }

  async removeTask(projectId: string, taskId: string): Promise<void> {
    const task = await this.findOneTask(projectId, taskId);
    await this.taskRepo.softRemove(task);
  }

  // ─────────────────────────────────────────────────────────────
  // SAISIES DE TEMPS
  // ─────────────────────────────────────────────────────────────

  async logTime(
    projectId: string,
    dto: CreateTimeEntryDto,
    currentUser: AuthenticatedUser,
  ): Promise<TimeEntry> {
    await this.findOne(projectId);

    // Récupère le taux horaire du membre ou 0
    const member = await this.memberRepo.findOne({
      where: { projectId, userId: currentUser.sub },
    });

    const hourlyRate = member?.hourlyRate ?? 0;

    if (dto.taskId) {
      const task = await this.taskRepo.findOne({
        where: { id: dto.taskId, projectId },
      });
      if (!task) throw new NotFoundException(`Tâche ${dto.taskId} introuvable`);
    }

    const entry = this.timeEntryRepo.create({
      ...dto,
      projectId,
      userId: currentUser.sub,
      hourlyRate,
    });
    const saved = await this.timeEntryRepo.save(entry);

    // Mettre à jour actualCost du projet et actualHours de la tâche
    await this.refreshProjectCost(projectId);
    if (dto.taskId) {
      await this.refreshTaskActualHours(dto.taskId);
    }

    return saved;
  }

  async findTimeEntries(projectId: string): Promise<TimeEntry[]> {
    return this.timeEntryRepo.find({
      where: { projectId },
      relations: ['user', 'task'],
      order: { entryDate: 'DESC' },
    });
  }

  async updateTimeEntry(
    projectId: string,
    entryId: string,
    dto: UpdateTimeEntryDto,
    currentUser: AuthenticatedUser,
  ): Promise<TimeEntry> {
    const entry = await this.timeEntryRepo.findOne({
      where: { id: entryId, projectId },
    });
    if (!entry) throw new NotFoundException(`Saisie ${entryId} introuvable`);

    // Seul l'auteur ou un admin peut modifier
    const isAdmin = [Role.ADMIN, Role.SUPER_ADMIN, Role.MANAGER].includes(
      currentUser.role as Role,
    );
    if (entry.userId !== currentUser.sub && !isAdmin) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres saisies');
    }

    const oldTaskId = entry.taskId;
    Object.assign(entry, dto);
    const saved = await this.timeEntryRepo.save(entry);

    await this.refreshProjectCost(projectId);
    if (oldTaskId) await this.refreshTaskActualHours(oldTaskId);
    if (dto.taskId && dto.taskId !== oldTaskId) {
      await this.refreshTaskActualHours(dto.taskId);
    }

    return saved;
  }

  async deleteTimeEntry(
    projectId: string,
    entryId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    const entry = await this.timeEntryRepo.findOne({
      where: { id: entryId, projectId },
    });
    if (!entry) throw new NotFoundException(`Saisie ${entryId} introuvable`);

    const isAdmin = [Role.ADMIN, Role.SUPER_ADMIN, Role.MANAGER].includes(
      currentUser.role as Role,
    );
    if (entry.userId !== currentUser.sub && !isAdmin) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres saisies');
    }

    const taskId = entry.taskId;
    await this.timeEntryRepo.remove(entry);
    await this.refreshProjectCost(projectId);
    if (taskId) await this.refreshTaskActualHours(taskId);
  }

  // ─────────────────────────────────────────────────────────────
  // STATS / DASHBOARD
  // ─────────────────────────────────────────────────────────────

  async getStats(): Promise<{
    byStatus: Record<string, number>;
    totalBudget: number;
    totalActualCost: number;
    overBudgetCount: number;
    activeCount: number;
  }> {
    const projects = await this.projectRepo.find();

    const byStatus: Record<string, number> = {};
    let totalBudget = 0;
    let totalActualCost = 0;
    let overBudgetCount = 0;

    for (const p of projects) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      totalBudget += Number(p.budget);
      totalActualCost += Number(p.actualCost);
      if (p.isOverBudget) overBudgetCount++;
    }

    return {
      byStatus,
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalActualCost: Math.round(totalActualCost * 100) / 100,
      overBudgetCount,
      activeCount: byStatus[ProjectStatus.ACTIVE] ?? 0,
    };
  }

  async getProjectDashboard(id: string): Promise<{
    project: Project;
    taskStats: Record<string, number>;
    totalHours: number;
    billableHours: number;
    timeByUser: { userId: string; name: string; hours: number }[];
  }> {
    const project = await this.findOne(id);
    const tasks = await this.findTasks(id);
    const entries = await this.findTimeEntries(id);

    const taskStats: Record<string, number> = {};
    for (const t of tasks) {
      taskStats[t.status] = (taskStats[t.status] ?? 0) + 1;
    }

    const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
    const billableHours = entries
      .filter((e) => e.isBillable)
      .reduce((s, e) => s + Number(e.hours), 0);

    const hoursMap = new Map<string, { name: string; hours: number }>();
    for (const e of entries) {
      const key = e.userId;
      const existing = hoursMap.get(key);
      const name = e.user
        ? `${e.user.firstName} ${e.user.lastName}`
        : e.userId;
      if (existing) {
        existing.hours += Number(e.hours);
      } else {
        hoursMap.set(key, { name, hours: Number(e.hours) });
      }
    }

    return {
      project,
      taskStats,
      totalHours: Math.round(totalHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      timeByUser: Array.from(hoursMap.entries()).map(([userId, v]) => ({
        userId,
        ...v,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS PRIVÉS
  // ─────────────────────────────────────────────────────────────

  private async refreshProjectCost(projectId: string): Promise<void> {
    const result = await this.timeEntryRepo
      .createQueryBuilder('e')
      .select('SUM(e.hours * e.hourly_rate)', 'totalCost')
      .where('e.project_id = :projectId', { projectId })
      .getRawOne<{ totalCost: string }>();

    const actualCost = parseFloat(result?.totalCost ?? '0') || 0;
    await this.projectRepo.update(projectId, { actualCost });
  }

  private async refreshTaskActualHours(taskId: string): Promise<void> {
    const result = await this.timeEntryRepo
      .createQueryBuilder('e')
      .select('SUM(e.hours)', 'totalHours')
      .where('e.task_id = :taskId', { taskId })
      .getRawOne<{ totalHours: string }>();

    const actualHours = parseFloat(result?.totalHours ?? '0') || 0;
    await this.taskRepo.update(taskId, { actualHours });
  }

  private async recalculateProjectProgress(projectId: string): Promise<void> {
    const rootTasks = await this.taskRepo.find({
      where: { projectId, parentTaskId: undefined },
    });

    if (rootTasks.length === 0) return;

    const doneCount = rootTasks.filter((t) => t.status === TaskStatus.DONE).length;
    const progressPercent = Math.round((doneCount / rootTasks.length) * 100);
    await this.projectRepo.update(projectId, { progressPercent });
  }
}

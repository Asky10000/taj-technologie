import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
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
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../auth/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ──────────────────────────────────────────────────────────────
  // PROJETS
  // ──────────────────────────────────────────────────────────────

  @Post()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Créer un projet' })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les projets (paginé)' })
  findAll(@Query() query: PaginationDto) {
    return this.projectsService.findAll(query);
  }

  @Get('stats')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Statistiques globales des projets' })
  getStats() {
    return this.projectsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un projet' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Dashboard projet (tâches, temps, coût)' })
  getDashboard(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getProjectDashboard(id);
  }

  @Patch(':id')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Modifier un projet' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Changer le statut du projet' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectStatusDto,
  ) {
    return this.projectsService.updateStatus(id, dto);
  }

  @Patch(':id/progress')
  @Roles(Role.TECHNICIAN)
  @ApiOperation({ summary: 'Mettre à jour l\'avancement manuel (%)' })
  updateProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.projectsService.updateProgress(id, dto);
  }

  @Delete(':id')
  @Roles(Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un projet (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.remove(id);
  }

  // ──────────────────────────────────────────────────────────────
  // MEMBRES
  // ──────────────────────────────────────────────────────────────

  @Post(':id/members')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Ajouter un membre au projet' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.projectsService.addMember(id, dto);
  }

  @Patch(':id/members/:memberId')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Modifier le rôle / taux d\'un membre' })
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.projectsService.updateMember(id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @Roles(Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer un membre du projet' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.projectsService.removeMember(id, memberId);
  }

  // ──────────────────────────────────────────────────────────────
  // TÂCHES
  // ──────────────────────────────────────────────────────────────

  @Post(':id/tasks')
  @Roles(Role.TECHNICIAN)
  @ApiOperation({ summary: 'Créer une tâche' })
  createTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.projectsService.createTask(id, dto);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Lister les tâches du projet' })
  findTasks(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findTasks(id);
  }

  @Get(':id/tasks/:taskId')
  @ApiOperation({ summary: 'Détail d\'une tâche' })
  findOneTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.projectsService.findOneTask(id, taskId);
  }

  @Patch(':id/tasks/:taskId')
  @Roles(Role.TECHNICIAN)
  @ApiOperation({ summary: 'Modifier une tâche' })
  updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.projectsService.updateTask(id, taskId, dto);
  }

  @Delete(':id/tasks/:taskId')
  @Roles(Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une tâche (soft delete)' })
  removeTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.projectsService.removeTask(id, taskId);
  }

  // ──────────────────────────────────────────────────────────────
  // SAISIES DE TEMPS
  // ──────────────────────────────────────────────────────────────

  @Post(':id/time-entries')
  @Roles(Role.TECHNICIAN)
  @ApiOperation({ summary: 'Saisir du temps sur un projet' })
  logTime(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTimeEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.logTime(id, dto, user);
  }

  @Get(':id/time-entries')
  @ApiOperation({ summary: 'Lister les saisies de temps du projet' })
  findTimeEntries(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findTimeEntries(id);
  }

  @Patch(':id/time-entries/:entryId')
  @Roles(Role.TECHNICIAN)
  @ApiOperation({ summary: 'Modifier une saisie de temps' })
  updateTimeEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateTimeEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.updateTimeEntry(id, entryId, dto, user);
  }

  @Delete(':id/time-entries/:entryId')
  @Roles(Role.TECHNICIAN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une saisie de temps' })
  deleteTimeEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.deleteTimeEntry(id, entryId, user);
  }
}

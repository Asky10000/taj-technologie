import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import {
  UpdateTicketDto, UpdateTicketStatusDto,
  AssignTicketDto, EscalateTicketDto, SatisfactionDto,
} from './dto/update-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../auth/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Tickets')
@ApiBearerAuth('JWT-auth')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ── CRUD ────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Créer un ticket de support' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() u: AuthenticatedUser) {
    return this.ticketsService.create(dto, u.id);
  }

  @Get()
  @ApiOperation({ summary: 'Liste paginée des tickets (filtrée selon rôle)' })
  findAll(@Query() query: QueryTicketsDto, @CurrentUser() u: AuthenticatedUser) {
    return this.ticketsService.findAll(query, u);
  }

  @Get('stats')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Statistiques globales tickets + SLA' })
  getStats() {
    return this.ticketsService.getStats();
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Détail d\'un ticket avec commentaires' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.TECHNICIAN, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifier un ticket' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, dto);
  }

  // ── WORKFLOW ────────────────────────────────────────────────

  @Patch(':id/status')
  @Roles(Role.TECHNICIAN, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Changer le statut d\'un ticket' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.ticketsService.updateStatus(id, dto, u.id);
  }

  @Patch(':id/assign')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assigner le ticket à un technicien' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.ticketsService.assign(id, dto);
  }

  @Post(':id/escalate')
  @Roles(Role.TECHNICIAN, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Escalader le ticket à un responsable' })
  escalate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EscalateTicketDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.ticketsService.escalate(id, dto, u.id);
  }

  @Post(':id/satisfaction')
  @ApiOperation({ summary: 'Soumettre une note de satisfaction (client — après résolution)' })
  recordSatisfaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SatisfactionDto,
  ) {
    return this.ticketsService.recordSatisfaction(id, dto);
  }

  // ── COMMENTAIRES ────────────────────────────────────────────

  @Post(':id/comments')
  @ApiOperation({ summary: 'Ajouter un commentaire / note interne' })
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.ticketsService.addComment(id, dto, u.id, u.role);
  }

  @Get(':id/comments')
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'internal', required: false, type: Boolean })
  @ApiOperation({ summary: 'Commentaires d\'un ticket (internal=true pour inclure les notes internes)' })
  findComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('internal') internal: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    const canSeeInternal = [
      Role.TECHNICIAN, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN,
    ].includes(u.role);
    const includeInternal = canSeeInternal && internal === 'true';
    return this.ticketsService.findComments(id, includeInternal);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'commentId' })
  @ApiOperation({ summary: 'Supprimer un commentaire (auteur ou admin)' })
  async deleteComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() u: AuthenticatedUser,
  ): Promise<void> {
    await this.ticketsService.deleteComment(commentId, u.id, u.role);
  }
}

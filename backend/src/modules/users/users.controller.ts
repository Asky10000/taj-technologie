import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../auth/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── CREATE ──────────────────────────────────────────────────
  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un utilisateur (ADMIN+)' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  create(@Body() dto: CreateUserDto, @CurrentUser() requester: AuthenticatedUser) {
    return this.usersService.create(dto, requester);
  }

  // ─── LIST ────────────────────────────────────────────────────
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Liste paginée des utilisateurs' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  // ─── STATS ───────────────────────────────────────────────────
  @Get('stats/by-role')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Nombre d\'utilisateurs par rôle' })
  countByRole() {
    return this.usersService.countByRole();
  }

  // ─── GET ONE ─────────────────────────────────────────────────
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SUPER_ADMIN)
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiOperation({ summary: 'Récupérer un utilisateur par ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  // ─── UPDATE ──────────────────────────────────────────────────
  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, requester);
  }

  // ─── UPDATE ROLE ─────────────────────────────────────────────
  @Patch(':id/role')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifier le rôle d\'un utilisateur' })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    return this.usersService.updateRole(id, dto.role, requester);
  }

  // ─── UPDATE STATUS ───────────────────────────────────────────
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifier le statut d\'un utilisateur' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    return this.usersService.updateStatus(id, dto.status, requester);
  }

  // ─── RESET PASSWORD ──────────────────────────────────────────
  @Patch(':id/password')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe d\'un utilisateur' })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() requester: AuthenticatedUser,
  ): Promise<void> {
    await this.usersService.resetPassword(id, dto.newPassword, requester);
  }

  // ─── DELETE ──────────────────────────────────────────────────
  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un utilisateur (soft delete)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser,
  ): Promise<void> {
    await this.usersService.remove(id, requester);
  }

  // ─── RESTORE ─────────────────────────────────────────────────
  @Post(':id/restore')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Restaurer un utilisateur supprimé' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.restore(id);
  }
}

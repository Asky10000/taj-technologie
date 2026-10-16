import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { InterventionsService } from './interventions.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { QueryInterventionsDto } from './dto/query-interventions.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../auth/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Interventions')
@ApiBearerAuth('JWT-auth')
@Controller('interventions')
export class InterventionsController {
  constructor(private readonly service: InterventionsService) {}

  @Post()
  @Roles(Role.TECHNICIAN, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer une intervention (compte-rendu de visite)' })
  create(@Body() dto: CreateInterventionDto, @CurrentUser() u: AuthenticatedUser) {
    return this.service.create(dto, u.id);
  }

  @Get()
  @ApiOperation({ summary: 'Liste paginée des interventions' })
  findAll(@Query() query: QueryInterventionsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Détail d\'une intervention' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.TECHNICIAN, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Modifier une intervention' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInterventionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Supprimer une intervention' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}

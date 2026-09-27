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
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ProspectsService } from '../services/prospects.service';
import { CreateProspectDto } from '../dto/create-prospect.dto';
import { UpdateProspectDto } from '../dto/update-prospect.dto';
import { QueryProspectsDto } from '../dto/query-prospects.dto';
import { ConvertProspectDto } from '../dto/convert-prospect.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '../../auth/enums/role.enum';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('CRM')
@ApiBearerAuth('JWT-auth')
@Controller('crm/prospects')
export class ProspectsController {
  constructor(private readonly prospectsService: ProspectsService) {}

  @Post()
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un prospect' })
  create(
    @Body() dto: CreateProspectDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    return this.prospectsService.create(dto, requester.id);
  }

  @Get()
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Liste paginée des prospects' })
  findAll(@Query() query: QueryProspectsDto) {
    return this.prospectsService.findAll(query);
  }

  @Get('pipeline')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Synthèse pipeline commercial (par statut)' })
  pipeline() {
    return this.prospectsService.pipeline();
  }

  @Get(':id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Détail d\'un prospect' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.prospectsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un prospect' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProspectDto,
  ) {
    return this.prospectsService.update(id, dto);
  }

  @Post(':id/convert')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Convertir le prospect en client' })
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertProspectDto,
  ) {
    return this.prospectsService.convert(id, dto);
  }

  @Delete(':id')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un prospect (soft delete)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.prospectsService.remove(id);
  }
}

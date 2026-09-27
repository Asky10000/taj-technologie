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
  ApiQuery,
} from '@nestjs/swagger';
import { InteractionsService } from '../services/interactions.service';
import { CreateInteractionDto } from '../dto/create-interaction.dto';
import { UpdateInteractionDto } from '../dto/update-interaction.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '../../auth/enums/role.enum';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('CRM')
@ApiBearerAuth('JWT-auth')
@Controller('crm/interactions')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post()
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Enregistrer une interaction' })
  create(
    @Body() dto: CreateInteractionDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    return this.interactionsService.create(dto, requester.id);
  }

  @Get()
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN)
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'prospectId', required: false })
  @ApiOperation({ summary: 'Historique des interactions' })
  findAll(
    @Query('customerId') customerId?: string,
    @Query('prospectId') prospectId?: string,
  ) {
    return this.interactionsService.findAll(customerId, prospectId);
  }

  @Get(':id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Détail d\'une interaction' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.interactionsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Mettre à jour une interaction' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInteractionDto,
  ) {
    return this.interactionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une interaction' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.interactionsService.remove(id);
  }
}

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
import { CustomersService } from '../services/customers.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { QueryCustomersDto } from '../dto/query-customers.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '../../auth/enums/role.enum';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('CRM')
@ApiBearerAuth('JWT-auth')
@Controller('crm/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un client' })
  create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    return this.customersService.create(dto, requester.id);
  }

  @Get()
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Liste paginée des clients' })
  findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Récupérer un client par ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un client' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un client (soft delete)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.customersService.remove(id);
  }

  @Post(':id/restore')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Restaurer un client supprimé' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.restore(id);
  }
}

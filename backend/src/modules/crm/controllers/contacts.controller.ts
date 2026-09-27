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
import { ContactsService } from '../services/contacts.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';

@ApiTags('CRM')
@ApiBearerAuth('JWT-auth')
@Controller('crm/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un contact' })
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Get()
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'prospectId', required: false })
  @ApiOperation({ summary: 'Liste des contacts (filtrable par client ou prospect)' })
  findAll(
    @Query('customerId') customerId?: string,
    @Query('prospectId') prospectId?: string,
  ) {
    return this.contactsService.findAll(customerId, prospectId);
  }

  @Get(':id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Détail d\'un contact' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un contact' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un contact (soft delete)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.contactsService.remove(id);
  }
}

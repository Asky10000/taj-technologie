import {
  Controller,
  Get,
  Post,
  Patch,
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
import { InventoryService } from './inventory.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CreateMovementDto, AdjustStockDto } from './dto/stock-movement.dto';
import { QueryStockDto, QueryMovementsDto } from './dto/query-stock.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../auth/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ──────────────── STOCKS ────────────────────────────────────

  @Post('stocks')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer une fiche stock pour un produit' })
  createStock(@Body() dto: CreateStockDto) {
    return this.inventoryService.createStock(dto);
  }

  @Get('stocks')
  @Roles(Role.TECHNICIAN, Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Liste paginée des stocks (filtres : alerte, rupture, recherche)' })
  findAll(@Query() query: QueryStockDto) {
    return this.inventoryService.findAllStocks(query);
  }

  @Get('stocks/alerts')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Alertes de stock — ruptures, critiques et avertissements' })
  getAlerts() {
    return this.inventoryService.getAlerts();
  }

  @Get('stocks/valuation')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Valorisation globale du stock (PUMP)' })
  getValuation() {
    return this.inventoryService.getValuation();
  }

  @Get('stocks/:id')
  @Roles(Role.TECHNICIAN, Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiParam({ name: 'id', description: 'UUID du stock' })
  @ApiOperation({ summary: 'Détail d\'un stock' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findOneStock(id);
  }

  @Get('stocks/product/:productId')
  @Roles(Role.TECHNICIAN, Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiParam({ name: 'productId', description: 'UUID du produit' })
  @ApiOperation({ summary: 'Stock d\'un produit spécifique' })
  findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventoryService.findStockByProduct(productId);
  }

  @Patch('stocks/:id')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour les seuils / paramètres d\'un stock' })
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.inventoryService.updateStock(id, dto);
  }

  // ──────────────── MOUVEMENTS ────────────────────────────────

  @Post('movements')
  @Roles(Role.TECHNICIAN, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Enregistrer un mouvement de stock (entrée / sortie / perte…)' })
  addMovement(
    @Body() dto: CreateMovementDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    return this.inventoryService.addMovement(dto, requester.id);
  }

  @Post('stocks/:id/adjust')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ajuster le stock à une quantité exacte (inventaire physique)' })
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    return this.inventoryService.adjustStock(id, dto, requester.id);
  }

  @Get('stocks/:id/movements')
  @Roles(Role.TECHNICIAN, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiParam({ name: 'id', description: 'UUID du stock' })
  @ApiOperation({ summary: 'Historique des mouvements d\'un stock' })
  findMovements(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryMovementsDto,
  ) {
    return this.inventoryService.findMovements(id, query);
  }
}

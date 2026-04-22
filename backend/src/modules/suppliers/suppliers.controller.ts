import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery,
} from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import {
  UpdateSupplierDto,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  UpdatePurchaseOrderStatusDto,
  ReceiveGoodsDto,
  RecordPaymentDto,
} from './dto/supplier-actions.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../auth/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PurchaseOrderStatus } from './enums/supplier.enums';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // ──────────────────────────────────────────────────────────────
  // FOURNISSEURS
  // ──────────────────────────────────────────────────────────────

  @Post()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Créer un fournisseur' })
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.createSupplier(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les fournisseurs (paginé)' })
  findAllSuppliers(@Query() query: PaginationDto) {
    return this.suppliersService.findAllSuppliers(query);
  }

  @Get('stats')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Statistiques fournisseurs' })
  getSupplierStats() {
    return this.suppliersService.getSupplierStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un fournisseur' })
  findOneSupplier(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.findOneSupplier(id);
  }

  @Patch(':id')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Modifier un fournisseur' })
  updateSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.updateSupplier(id, dto);
  }

  @Delete(':id')
  @Roles(Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un fournisseur (soft delete)' })
  removeSupplier(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.removeSupplier(id);
  }

  // ──────────────────────────────────────────────────────────────
  // BONS DE COMMANDE FOURNISSEUR
  // ──────────────────────────────────────────────────────────────

  @Post('purchase-orders')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Créer un bon de commande fournisseur' })
  createPurchaseOrder(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suppliersService.createPurchaseOrder(dto, user);
  }

  @Get('purchase-orders')
  @ApiOperation({ summary: 'Lister les bons de commande (paginé)' })
  @ApiQuery({ name: 'supplierId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: PurchaseOrderStatus })
  findAllPurchaseOrders(
    @Query() query: PaginationDto & { supplierId?: string; status?: PurchaseOrderStatus },
  ) {
    return this.suppliersService.findAllPurchaseOrders(query);
  }

  @Get('purchase-orders/:poId')
  @ApiOperation({ summary: 'Détail d\'un bon de commande' })
  findOnePurchaseOrder(@Param('poId', ParseUUIDPipe) poId: string) {
    return this.suppliersService.findOnePurchaseOrder(poId);
  }

  @Patch('purchase-orders/:poId')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Modifier un bon de commande (brouillon seulement)' })
  updatePurchaseOrder(
    @Param('poId', ParseUUIDPipe) poId: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.suppliersService.updatePurchaseOrder(poId, dto);
  }

  @Patch('purchase-orders/:poId/status')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Changer le statut d\'un bon de commande' })
  updatePurchaseOrderStatus(
    @Param('poId', ParseUUIDPipe) poId: string,
    @Body() dto: UpdatePurchaseOrderStatusDto,
  ) {
    return this.suppliersService.updatePurchaseOrderStatus(poId, dto);
  }

  @Post('purchase-orders/:poId/cancel')
  @Roles(Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler un bon de commande' })
  cancelPurchaseOrder(@Param('poId', ParseUUIDPipe) poId: string) {
    return this.suppliersService.cancelPurchaseOrder(poId);
  }

  @Post('purchase-orders/:poId/receive')
  @Roles(Role.TECHNICIAN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réceptionner des marchandises (entrée en stock automatique)' })
  receiveGoods(
    @Param('poId', ParseUUIDPipe) poId: string,
    @Body() dto: ReceiveGoodsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suppliersService.receiveGoods(poId, dto, user);
  }

  @Post('purchase-orders/:poId/payment')
  @Roles(Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enregistrer un paiement fournisseur' })
  recordPayment(
    @Param('poId', ParseUUIDPipe) poId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.suppliersService.recordPayment(poId, dto);
  }

  // ──────────────────────────────────────────────────────────────
  // COMMANDES D'UN FOURNISSEUR SPÉCIFIQUE
  // ──────────────────────────────────────────────────────────────

  @Get(':id/purchase-orders')
  @ApiOperation({ summary: 'Bons de commande d\'un fournisseur' })
  getSupplierOrders(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationDto,
  ) {
    return this.suppliersService.findAllPurchaseOrders({ ...query, supplierId: id });
  }
}

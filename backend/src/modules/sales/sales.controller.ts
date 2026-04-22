import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { QuotesService } from './services/quotes.service';
import { OrdersService } from './services/orders.service';
import { InvoicesService } from './services/invoices.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateQuoteDto, UpdateOrderDto, UpdateInvoiceDto, RecordPaymentDto } from './dto/update-sales.dto';
import { QueryQuotesDto, QueryOrdersDto, QueryInvoicesDto } from './dto/query-sales.dto';
import { QuoteStatus, OrderStatus } from './enums/sales.enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../auth/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateQuoteStatusDto { @ApiProperty({ enum: QuoteStatus }) @IsEnum(QuoteStatus) status: QuoteStatus; }
class UpdateOrderStatusDto { @ApiProperty({ enum: OrderStatus }) @IsEnum(OrderStatus) status: OrderStatus; }

@ApiTags('Sales')
@ApiBearerAuth('JWT-auth')
@Controller('sales')
export class SalesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly ordersService: OrdersService,
    private readonly invoicesService: InvoicesService,
  ) {}

  // ─────────────────── DEVIS ──────────────────────────────────

  @Post('quotes')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un devis' })
  createQuote(@Body() dto: CreateQuoteDto, @CurrentUser() u: AuthenticatedUser) {
    return this.quotesService.create(dto, u.id);
  }

  @Get('quotes')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Liste paginée des devis' })
  findQuotes(@Query() query: QueryQuotesDto) {
    return this.quotesService.findAll(query);
  }

  @Get('quotes/:id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Détail d\'un devis avec lignes' })
  findQuote(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotesService.findOne(id);
  }

  @Patch('quotes/:id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un devis (brouillon seulement)' })
  updateQuote(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuoteDto) {
    return this.quotesService.update(id, dto);
  }

  @Patch('quotes/:id/status')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Changer le statut d\'un devis' })
  updateQuoteStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuoteStatusDto) {
    return this.quotesService.updateStatus(id, dto.status);
  }

  @Delete('quotes/:id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un devis (brouillon seulement)' })
  async removeQuote(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.quotesService.remove(id);
  }

  // ─────────────────── COMMANDES ──────────────────────────────

  @Post('orders')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer une commande (ou depuis un devis accepté)' })
  createOrder(@Body() dto: CreateOrderDto, @CurrentUser() u: AuthenticatedUser) {
    return this.ordersService.create(dto, u.id);
  }

  @Get('orders')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Liste paginée des commandes' })
  findOrders(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(query);
  }

  @Get('orders/:id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT, Role.TECHNICIAN)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Détail d\'une commande avec lignes' })
  findOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch('orders/:id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour une commande' })
  updateOrder(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Patch('orders/:id/status')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Changer le statut d\'une commande (déclenche sortie stock à DELIVERED)' })
  updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.ordersService.updateStatus(id, dto.status, u.id);
  }

  @Delete('orders/:id')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une commande (PENDING seulement)' })
  async removeOrder(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.ordersService.remove(id);
  }

  // ─────────────────── FACTURES ───────────────────────────────

  @Post('invoices')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Créer une facture' })
  createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() u: AuthenticatedUser) {
    return this.invoicesService.create(dto, u.id);
  }

  @Get('invoices')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Liste paginée des factures' })
  findInvoices(@Query() query: QueryInvoicesDto) {
    return this.invoicesService.findAll(query);
  }

  @Get('invoices/overdue')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Factures en retard de paiement' })
  overdueInvoices() {
    return this.invoicesService.getOverdueInvoices();
  }

  @Get('invoices/:id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Détail d\'une facture avec lignes' })
  findInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch('invoices/:id')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Mettre à jour une facture (brouillon seulement)' })
  updateInvoice(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Post('invoices/:id/send')
  @Roles(Role.SALES, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Envoyer la facture (DRAFT → SENT)' })
  sendInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.send(id);
  }

  @Post('invoices/:id/payment')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Enregistrer un paiement sur une facture' })
  recordPayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordPaymentDto) {
    return this.invoicesService.recordPayment(id, dto);
  }

  @Post('invoices/:id/cancel')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Annuler une facture' })
  cancelInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.cancel(id);
  }

  @Post('invoices/mark-overdue')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Passer en OVERDUE toutes les factures échues' })
  markOverdue() {
    return this.invoicesService.markOverdue();
  }
}

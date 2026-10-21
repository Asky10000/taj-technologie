import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Paiements d\'une facture ou d\'une commande fournisseur' })
  @ApiQuery({ name: 'invoiceId', required: false })
  @ApiQuery({ name: 'purchaseOrderId', required: false })
  list(
    @Query('invoiceId') invoiceId?: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
  ) {
    if (invoiceId) return this.service.findByInvoice(invoiceId);
    if (purchaseOrderId) return this.service.findByPurchaseOrder(purchaseOrderId);
    return [];
  }
}

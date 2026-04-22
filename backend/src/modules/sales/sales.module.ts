import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { Order } from './entities/order.entity';
import { Invoice } from './entities/invoice.entity';
import { SaleLine } from './entities/sale-line.entity';
import { QuotesService } from './services/quotes.service';
import { OrdersService } from './services/orders.service';
import { InvoicesService } from './services/invoices.service';
import { SalesCalculatorService } from './services/sales-calculator.service';
import { SalesController } from './sales.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, Order, Invoice, SaleLine]),
    InventoryModule,
  ],
  controllers: [SalesController],
  providers: [
    QuotesService,
    OrdersService,
    InvoicesService,
    SalesCalculatorService,
  ],
  exports: [QuotesService, OrdersService, InvoicesService, SalesCalculatorService],
})
export class SalesModule {}

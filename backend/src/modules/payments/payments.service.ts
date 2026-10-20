import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from '../sales/enums/sales.enums';

export interface RecordPaymentInput {
  invoiceId?: string;
  purchaseOrderId?: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  reference?: string;
  paidAt?: Date;
  proofUrl?: string;
  createdById?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly repo: Repository<Payment>,
  ) {}

  /** Crée une ligne de paiement (appelé par les factures et les commandes). */
  async record(input: RecordPaymentInput): Promise<Payment> {
    const payment = this.repo.create({
      ...input,
      paidAt: input.paidAt ?? new Date(),
    });
    return this.repo.save(payment);
  }

  findByInvoice(invoiceId: string): Promise<Payment[]> {
    return this.repo.find({
      where: { invoiceId },
      relations: ['createdBy'],
      order: { paidAt: 'ASC' },
    });
  }

  findByPurchaseOrder(purchaseOrderId: string): Promise<Payment[]> {
    return this.repo.find({
      where: { purchaseOrderId },
      relations: ['createdBy'],
      order: { paidAt: 'ASC' },
    });
  }
}

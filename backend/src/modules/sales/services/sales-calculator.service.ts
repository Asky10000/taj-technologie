import { Injectable } from '@nestjs/common';
import { SaleLineDto } from '../dto/sale-line.dto';
import { DiscountType } from '../enums/sales.enums';

export interface LineTotals {
  discountAmount: number;
  subtotalHT: number;
  taxAmount: number;
  totalTTC: number;
}

export interface DocumentTotals {
  totalHT: number;
  totalTax: number;
  totalTTC: number;
}

@Injectable()
export class SalesCalculatorService {
  calculateLine(line: SaleLineDto): LineTotals {
    const qty = Number(line.quantity);
    const up = Number(line.unitPrice);
    const discountValue = Number(line.discountValue ?? 0);
    const taxRate = Number(line.taxRate ?? 20);

    let discountAmount = 0;
    if (line.discountType === DiscountType.FIXED) {
      discountAmount = discountValue;
    } else {
      discountAmount = Math.round(qty * up * (discountValue / 100) * 10000) / 10000;
    }

    const subtotalHT = Math.round((qty * up - discountAmount) * 100) / 100;
    const taxAmount = Math.round(subtotalHT * (taxRate / 100) * 100) / 100;
    const totalTTC = Math.round((subtotalHT + taxAmount) * 100) / 100;

    return { discountAmount, subtotalHT, taxAmount, totalTTC };
  }

  calculateDocument(lines: SaleLineDto[], globalDiscountPercent = 0): DocumentTotals {
    let totalHT = 0;
    let totalTax = 0;

    for (const line of lines) {
      const { subtotalHT, taxAmount } = this.calculateLine(line);
      totalHT += subtotalHT;
      totalTax += taxAmount;
    }

    // Remise globale sur le HT
    if (globalDiscountPercent > 0) {
      const globalDiscount = Math.round(totalHT * (globalDiscountPercent / 100) * 100) / 100;
      totalHT = Math.round((totalHT - globalDiscount) * 100) / 100;
      totalTax = Math.round(totalTax * (1 - globalDiscountPercent / 100) * 100) / 100;
    }

    const totalTTC = Math.round((totalHT + totalTax) * 100) / 100;

    return {
      totalHT: Math.round(totalHT * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalTTC,
    };
  }
}

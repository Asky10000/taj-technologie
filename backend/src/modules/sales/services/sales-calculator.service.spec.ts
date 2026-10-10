import { SalesCalculatorService } from './sales-calculator.service';
import { SaleLineDto } from '../dto/sale-line.dto';
import { DiscountType } from '../enums/sales.enums';

/**
 * Tests unitaires du calcul des documents de vente.
 * Logique pure (aucune base de données) : montants en FCFA, toujours
 * arrondis à l'entier.
 */
describe('SalesCalculatorService', () => {
  let service: SalesCalculatorService;

  // Fabrique une ligne avec des valeurs par défaut raisonnables.
  const line = (overrides: Partial<SaleLineDto> = {}): SaleLineDto => ({
    description: 'Article',
    quantity: 1,
    unitPrice: 1000,
    ...overrides,
  });

  beforeEach(() => {
    service = new SalesCalculatorService();
  });

  describe('calculateLine', () => {
    it('applique la TVA par défaut de 20 % sans remise', () => {
      const result = service.calculateLine(line({ quantity: 2, unitPrice: 1000 }));

      expect(result).toEqual({
        discountAmount: 0,
        subtotalHT: 2000,
        taxAmount: 400,
        totalTTC: 2400,
      });
    });

    it('applique une remise en pourcentage (PERCENT)', () => {
      const result = service.calculateLine(
        line({
          quantity: 2,
          unitPrice: 1000,
          discountType: DiscountType.PERCENT,
          discountValue: 10,
        }),
      );

      // 2000 HT - 10 % = 1800 ; TVA 20 % = 360 ; TTC = 2160
      expect(result.discountAmount).toBe(200);
      expect(result.subtotalHT).toBe(1800);
      expect(result.taxAmount).toBe(360);
      expect(result.totalTTC).toBe(2160);
    });

    it('applique une remise fixe (FIXED)', () => {
      const result = service.calculateLine(
        line({
          quantity: 2,
          unitPrice: 1000,
          discountType: DiscountType.FIXED,
          discountValue: 500,
        }),
      );

      // 2000 HT - 500 = 1500 ; TVA 20 % = 300 ; TTC = 1800
      expect(result.discountAmount).toBe(500);
      expect(result.subtotalHT).toBe(1500);
      expect(result.taxAmount).toBe(300);
      expect(result.totalTTC).toBe(1800);
    });

    it('respecte un taux de TVA personnalisé de 0 %', () => {
      const result = service.calculateLine(
        line({ quantity: 1, unitPrice: 1000, taxRate: 0 }),
      );

      expect(result.taxAmount).toBe(0);
      expect(result.totalTTC).toBe(1000);
    });

    it('arrondit les montants à l’entier (FCFA, pas de sous-unité)', () => {
      // 3 × 333 = 999 ; TVA 20 % = 199,8 → arrondi à 200 ; TTC = 1199
      const result = service.calculateLine(line({ quantity: 3, unitPrice: 333 }));

      expect(result.subtotalHT).toBe(999);
      expect(result.taxAmount).toBe(200);
      expect(result.totalTTC).toBe(1199);
    });
  });

  describe('calculateDocument', () => {
    it('somme plusieurs lignes sans remise globale', () => {
      const result = service.calculateDocument([
        line({ quantity: 2, unitPrice: 1000 }), // HT 2000, TVA 400
        line({ quantity: 1, unitPrice: 1000 }), // HT 1000, TVA 200
      ]);

      expect(result).toEqual({
        totalHT: 3000,
        totalTax: 600,
        totalTTC: 3600,
      });
    });

    it('applique une remise globale en pourcentage sur le HT et la TVA', () => {
      const result = service.calculateDocument(
        [
          line({ quantity: 2, unitPrice: 1000 }), // HT 2000, TVA 400
          line({ quantity: 1, unitPrice: 1000 }), // HT 1000, TVA 200
        ],
        10, // remise globale 10 %
      );

      // HT 3000 - 10 % = 2700 ; TVA 600 × 0,9 = 540 ; TTC = 3240
      expect(result.totalHT).toBe(2700);
      expect(result.totalTax).toBe(540);
      expect(result.totalTTC).toBe(3240);
    });

    it('renvoie des totaux nuls pour un document sans ligne', () => {
      expect(service.calculateDocument([])).toEqual({
        totalHT: 0,
        totalTax: 0,
        totalTTC: 0,
      });
    });

    it('ignore une remise globale nulle ou négative', () => {
      const lines = [line({ quantity: 1, unitPrice: 1000 })];

      expect(service.calculateDocument(lines, 0)).toEqual(
        service.calculateDocument(lines),
      );
    });
  });
});

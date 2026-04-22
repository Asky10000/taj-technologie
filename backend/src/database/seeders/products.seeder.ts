import { DataSource } from 'typeorm';
import { ISeeder } from './seeder.interface';
import { Category } from '../../modules/products/entities/category.entity';
import { Product } from '../../modules/products/entities/product.entity';
import {
  ProductType,
  ProductStatus,
  PriceType,
  StockPolicy,
} from '../../modules/products/enums/product.enums';

export class ProductsSeeder implements ISeeder {
  readonly name = 'ProductsSeeder';

  async run(dataSource: DataSource): Promise<void> {
    const catRepo = dataSource.getRepository(Category);
    const prodRepo = dataSource.getRepository(Product);

    // ── Catégories ──────────────────────────────────────────────
    const cats = [
      { name: 'Matériel Informatique', slug: 'materiel-informatique', productType: ProductType.HARDWARE, sortOrder: 1 },
      { name: 'Consommables',          slug: 'consommables',          productType: ProductType.CONSUMABLE, sortOrder: 2 },
      { name: 'Logiciels & Licences',  slug: 'logiciels-licences',    productType: ProductType.SOFTWARE, sortOrder: 3 },
      { name: 'Services IT',           slug: 'services-it',           productType: ProductType.SERVICE, sortOrder: 4 },
      { name: 'Abonnements',           slug: 'abonnements',           productType: ProductType.SUBSCRIPTION, sortOrder: 5 },
    ];

    const savedCats: Record<string, Category> = {};
    for (const c of cats) {
      let cat = await catRepo.findOne({ where: { slug: c.slug } });
      if (!cat) {
        cat = await catRepo.save(catRepo.create(c));
      }
      savedCats[c.slug] = cat;
    }

    // ── Produits démo ────────────────────────────────────────────
    const products = [
      {
        sku: 'PRD-HP-LASER-001',
        name: 'HP LaserJet Pro M404n',
        type: ProductType.HARDWARE,
        sellingPrice: 320,
        costPrice: 220,
        taxRate: 20,
        brand: 'HP',
        unit: 'pièce',
        warrantyMonths: 12,
        stockPolicy: StockPolicy.TRACKED,
        categoryId: savedCats['materiel-informatique'].id,
      },
      {
        sku: 'PRD-CART-HP-001',
        name: 'Cartouche HP CF258A',
        type: ProductType.CONSUMABLE,
        sellingPrice: 28,
        costPrice: 14,
        taxRate: 20,
        brand: 'HP',
        unit: 'pièce',
        stockPolicy: StockPolicy.TRACKED,
        categoryId: savedCats['consommables'].id,
      },
      {
        sku: 'SRV-SUPPORT-H',
        name: 'Support Informatique (Horaire)',
        type: ProductType.SERVICE,
        priceType: PriceType.HOURLY,
        sellingPrice: 80,
        costPrice: 40,
        taxRate: 20,
        unit: 'heure',
        stockPolicy: StockPolicy.UNTRACKED,
        categoryId: savedCats['services-it'].id,
      },
      {
        sku: 'SRV-MAINTENANCE-M',
        name: 'Contrat de Maintenance Mensuel',
        type: ProductType.SUBSCRIPTION,
        priceType: PriceType.MONTHLY,
        sellingPrice: 150,
        costPrice: 60,
        taxRate: 20,
        unit: 'mois',
        stockPolicy: StockPolicy.UNTRACKED,
        categoryId: savedCats['abonnements'].id,
      },
    ];

    for (const p of products) {
      const exists = await prodRepo.findOne({ where: { sku: p.sku } });
      if (!exists) {
        await prodRepo.save(prodRepo.create({ ...p, imageUrls: [], tags: [] }));
      }
    }

    console.log(`      → ${products.length} produits et ${cats.length} catégories initialisés`);
  }
}

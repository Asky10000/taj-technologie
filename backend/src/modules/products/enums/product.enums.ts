export enum ProductType {
  HARDWARE = 'HARDWARE',       // Matériel informatique
  CONSUMABLE = 'CONSUMABLE',   // Consommables (cartouches, câbles…)
  SOFTWARE = 'SOFTWARE',       // Logiciels / licences
  SERVICE = 'SERVICE',         // Prestations de service
  SUBSCRIPTION = 'SUBSCRIPTION', // Abonnements récurrents
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export enum TaxRate {
  ZERO = 0,
  REDUCED = 5.5,
  INTERMEDIATE = 10,
  STANDARD = 20,
}

export enum PriceType {
  FIXED = 'FIXED',         // Prix fixe
  HOURLY = 'HOURLY',       // Tarif horaire (services)
  DAILY = 'DAILY',         // Tarif journalier
  MONTHLY = 'MONTHLY',     // Abonnement mensuel
  ANNUAL = 'ANNUAL',       // Abonnement annuel
}

export enum StockPolicy {
  TRACKED = 'TRACKED',     // Stock géré (hardware, consommables)
  UNTRACKED = 'UNTRACKED', // Stock non géré (services, logiciels)
}

export enum MovementType {
  IN = 'IN',               // Entrée (achat, réception fournisseur)
  OUT = 'OUT',             // Sortie (vente, utilisation)
  ADJUSTMENT = 'ADJUSTMENT', // Ajustement inventaire
  TRANSFER = 'TRANSFER',   // Transfert inter-entrepôt
  RETURN = 'RETURN',       // Retour client
  LOSS = 'LOSS',           // Perte / casse
  INITIAL = 'INITIAL',     // Stock initial
}

export enum MovementReason {
  PURCHASE = 'PURCHASE',           // Bon de commande fournisseur
  SALE = 'SALE',                   // Commande client
  INVENTORY_COUNT = 'INVENTORY_COUNT', // Inventaire physique
  DAMAGE = 'DAMAGE',               // Dommage / casse
  EXPIRY = 'EXPIRY',               // Péremption
  RETURN_FROM_CLIENT = 'RETURN_FROM_CLIENT',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
  MANUAL = 'MANUAL',               // Ajustement manuel
  OTHER = 'OTHER',
}

export enum StockAlertLevel {
  OK = 'OK',
  WARNING = 'WARNING',   // En dessous du seuil minimum
  CRITICAL = 'CRITICAL', // Rupture imminente (< 20% du seuil)
  OUT = 'OUT',           // Rupture de stock
}

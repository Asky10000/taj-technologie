export type ProductType   = 'HARDWARE' | 'CONSUMABLE' | 'SOFTWARE' | 'SERVICE' | 'SUBSCRIPTION';
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'OUT_OF_STOCK';
export type PriceType     = 'FIXED' | 'HOURLY' | 'DAILY' | 'MONTHLY' | 'ANNUAL';
export type StockPolicy   = 'TRACKED' | 'UNTRACKED';

export interface ProductCategory {
  id:       string;
  name:     string;
  slug:     string;
  parentId?: string;
}

export interface Product {
  id:               string;
  sku:              string;
  name:             string;
  description?:     string;
  shortDescription?: string;
  type:             ProductType;
  status:           ProductStatus;
  priceType:        PriceType;
  sellingPrice:     number;
  costPrice?:       number;
  taxRate:          number;
  priceWithTax:     number;
  stockPolicy:      StockPolicy;
  brand?:           string;
  model?:           string;
  barcode?:         string;
  unit:             string;
  weight?:          number;
  warrantyMonths?:  number;
  tags?:            string[];
  categoryId?:      string;
  category?:        ProductCategory;
  createdAt:        string;
  updatedAt:        string;
}

export interface CreateProductPayload {
  name:              string;
  type:              ProductType;
  sellingPrice:      number;
  taxRate?:          number;
  costPrice?:        number;
  sku?:              string;
  shortDescription?: string;
  brand?:            string;
  model?:            string;
  unit?:             string;
  barcode?:          string;
  warrantyMonths?:   number;
  stockPolicy?:      StockPolicy;
  priceType?:        PriceType;
  categoryId?:       string;
}

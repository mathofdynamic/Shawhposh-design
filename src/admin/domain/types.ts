export type { StaffRole } from '../router/types';

export type ProductStatus = 'active' | 'draft' | 'archived';
export type ProductType = 'finished' | 'customizable_blank';
export type GarmentFit = 'oversize' | 'classic' | 'slim' | 'oversized' | 'regular' | 'crop';

export interface ProductVariant {
  id: string;
  sku: string;
  productId: string;
  size: string;
  colorName: string;
  colorHex: string;
  fit: GarmentFit;
  material?: string;
  onHandStock: number;
  reservedStock: number;
  minStockThreshold: number;
  priceAdjustmentTomans: number;
  priceTomans?: number | null;
  available?: number;
  isEnabled?: boolean;
  warehouseLocation?: string;
  weightGrams?: number | null;
}

export interface AdminProduct {
  id: string;
  skuPrefix: string;
  name: string;
  nameEn?: string;
  slug: string;
  category: string;
  basePriceTomans: number;
  description: string;
  fabricSpecs: string;
  cut?: string;
  measurements?: string;
  careInstructions?: string;
  printingMethod?: string;
  images: string[];
  primaryImage?: string;
  imageAlts?: Record<string, string>;
  isLive: boolean;
  status: ProductStatus;
  isCustomizable: boolean;
  productType?: ProductType;
  printingTechnique?: string;
  permittedPrintAreas?: string[];
  baseGarmentSku?: string;
  seoTitle?: string;
  seoMetaDescription?: string;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt?: string;
  tags: string[];
  details?: string[];
  featured: boolean;
}

export interface AdminCategory {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  description?: string;
  imageUrl?: string;
  image?: string;
  displayOrder: number;
  isFeatured: boolean;
  status: 'active' | 'archived';
}

export type StockMovementType = 'manual_adjustment' | 'order_reservation' | 'reservation_release' | 'reservation_expired' | string;

export interface StockMovement {
  id: string;
  timestamp: string;
  sku: string;
  productId: string;
  type: StockMovementType;
  quantityChange: number;
  fieldAffected: 'onHand' | 'reserved' | string;
  previousOnHand: number;
  newOnHand: number;
  previousReserved: number;
  newReserved: number;
  reason: string;
  actorId?: string | null;
  actorName?: string;
}

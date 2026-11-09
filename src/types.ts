export type GarmentType = 'hoodie' | 'dors' | 'tshirt' | 'sweatshirt' | 'halfzip' | 'pants';

export interface Product {
  id: string;
  slug?: string;
  variants?: {id:string;colorHex:string;colorName:string;size:string;priceTomans:number|null;originalPriceTomans?:number;inStock:boolean}[];
  name: string;
  price: number;
  originalPriceTomans?: number | null;
  discountPercent?: number;
  garmentType?: GarmentType | null;
  description: string;
  details: string[];
  category: string;
  images: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  sku?: string;
  productName: string;
  price: number;
  quantity: number;
  color: { name: string; hex: string };
  size: string;
  image: string;
  availabilityCode?: string | null;
  isCustom?: boolean; // Legacy marker used only to reject old local custom-design cart entries.
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
}


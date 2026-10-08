export interface Product {
  id: string;
  slug?: string;
  variants?: {id:string;sku:string;colorHex:string;size:string;priceTomans:number|null;available:number}[];
  name: string;
  price: number;
  description: string;
  details: string[];
  category: 'minimalist' | 'calligraphy' | 'graphic';
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
  availableQuantity?: number;
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


export interface Product {
  id: string;
  name: string;
  price: number; // in Tomans (discounted price if discount is present)
  originalPrice?: number; // optional, before discount
  discountPercent?: number; // optional, discount percentage e.g., 10 for 10%
  description: string;
  details: string[];
  category: 'minimalist' | 'calligraphy' | 'graphic' | 'pod';
  images: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  rating: number;
  reviewsCount: number;
  isPopular?: boolean;
  isNew?: boolean;
}

export interface CustomDesign {
  text: string;
  textColor: string;
  textSize: number; // in percentage / scale
  textPosition: { x: number; y: number }; // percentages
  selectedGraphicId: string | null;
  tshirtColor: string;
  tshirtColorHex: string;
  basePrice: number;
}

export interface CartItem {
  id: string; // unique cart item id (product.id + color + size or custom design uuid)
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  color: { name: string; hex: string };
  size: string;
  image: string;
  isCustom?: boolean;
  customDesign?: CustomDesign;
}

export interface Order {
  id: string;
  items: CartItem[];
  totalPrice: number;
  customerDetails: {
    fullName: string;
    phone: string;
    email: string;
    city: string;
    address: string;
    postalCode: string;
  };
  date: string;
  status: 'pending' | 'processing' | 'shipped';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
}


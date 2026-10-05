
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  lastLogin: string;
}

export interface CategoryAttribute {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[]; // For select type
  required: boolean;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  attributes: CategoryAttribute[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Variant {
  sku: string;
  attrValues: Record<string, any>;
  price: number;
  costPrice: number; // For profit reports
  stock: number;
  lowStockThreshold: number;
}

export interface GSTRates {
  cgst: number;
  sgst: number;
  igst: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  hsnCode: string;
  gstRates: GSTRates;
  variants: Variant[];
  // Flat dynamic ERP properties for compatibility with single-variant flow
  sku?: string;
  sellingPrice?: number;
  costPrice?: number;
  stock?: number;
  minimumStock?: number;
  attributes?: Record<string, any>;
}

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  price: number;
  costPrice: number;
  gstRate: number;
  discount: number;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerGst?: string;
  items: CartItem[];
  subTotal: number;
  totalGst: number;
  totalDiscount: number;
  grandTotal: number;
  paymentMode: 'CASH' | 'CARD' | 'UPI';
  timestamp: string;
  userId: string;
  status?: 'PAID' | 'RETURNED' | 'CREDIT_NOTE_ISSUED';
  returnedItems?: { sku: string; qty: number; timestamp: string }[];
}

export type MovementType = 'IN' | 'OUT' | 'ADJUST';

export interface StockMovement {
  id: string;
  timestamp: string;
  productId: string;
  variantSku: string;
  type: MovementType;
  qty: number;
  reason: string;
  userId: string;
  referenceId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  details: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalValuation: number;
  todayRevenue: number;
  monthlyRevenue: number;
  profitToday: number;
  skuCount: number;
  totalTransactionsToday: number;
}

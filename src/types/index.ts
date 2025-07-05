export type Role =
  | "Salesman"
  | "Team Operation Manager"
  | "Group Operation Manager"
  | "Head Group Manager"
  | "Regional Director"
  | "Admin"
  | "Shop Manager";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  referrerId: string | null;
  referralCode: string;
  totalIncome: number;
  avatar: string;
  createdAt: string;
}

export interface Customer {
  id:string;
  name: string;
  contactInfo: string;
  address: string;
  tokenSerial: string;
  salesmanId: string;
  saleDate: string;
  commissionDistributed: boolean;
}

export interface ProductSale {
  id: string;
  productName: string;
  productCode?: string;
  price: number;
  paymentMethod: 'cash' | 'installments';
  customerId: string;
  customerName: string;
  tokenSerial: string;
  saleDate: string;
  shopManagerId: string;
  shopManagerName: string;
}

export interface CommissionSettings {
  tokenPrice: number;
  salesman: number;
  teamOperationManager: number;
  groupOperationManager: number;
  headGroupManager: number;
  regionalDirector: number;
  admin: number;
}

export interface IncomeRecord {
  id: string;
  userId: string;
  amount: number;
  saleDate: string;
  grantedForRole: Role;
  salesmanId: string; // The salesman who made the original token sale
  salesmanName: string;
  // Source details
  sourceType: 'token_sale' | 'product_sale';
  customerId: string;
  customerName: string;
  // Optional product details
  productName?: string;
  productPrice?: number;
  paymentMethod?: 'cash' | 'installments';
}

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
  mobileNumber: string;
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
  tokenIsAvailable: boolean;
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
  shopManagerName?: string; // The shop manager who made the product sale
  // Source details
  sourceType: 'token_sale' | 'product_sale';
  customerId: string;
  customerName: string;
  tokenSerial?: string;
  // Optional product details
  productName?: string;
  productPrice?: number;
  paymentMethod?: 'cash' | 'installments';
}


// New types for product commission settings
export interface CommissionValues {
  cash: number;
  installments: number;
}

export type ProductCommissionRole = "salesman" | "teamOperationManager" | "groupOperationManager" | "headGroupManager" | "regionalDirector" | "admin";

export interface ProductCommissionTier {
  id: string;
  minPrice: number;
  maxPrice: number | null; // null for the highest tier
  commissions: Record<ProductCommissionRole, CommissionValues>;
}

export interface ProductCommissionSettings {
  tiers: ProductCommissionTier[];
}

export interface SignupRoleSettings {
  visibleRoles: {
    [key in Role]?: boolean;
  };
}

export type Role =
  | "Salesman"
  | "Team Operation Manager"
  | "Group Operation Manager"
  | "Head Group Manager"
  | "Regional Director"
  | "Admin"
  | "Delivery Boy"
  | "Recovery Officer";

export type SalesmanStage = "BUSINESS PROMOTER (stage 01)" | "MARKETING EXECUTIVE (stage 02)";

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
  branch?: string;
  salesmanStage?: SalesmanStage | null;
}

export interface Customer {
  id:string;
  name: string;
  contactInfo: string;
  address: string;
  tokenSerial: string;
  salesmanId: string;
  saleDate: string;
  commissionStatus: 'pending' | 'approved' | 'rejected';
  tokenIsAvailable: boolean;

  // New fields from user request
  whatsappNumber?: string;
  email?: string;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  branch?: string;
  purchasingItem?: string;
  purchasingItemCode?: string;
  totalValue?: number;
  discountValue?: number;
  downPayment?: number;
  installments?: number;
  monthlyInstallment?: number;
}

export interface CommissionRequest {
    id: string;
    customerId: string;
    customerName: string;
    salesmanId: string;
    salesmanName: string;
    tokenSerial: string;
    requestDate: string;
    status: 'pending' | 'approved' | 'rejected';
    approverId?: string;
    approverName?: string;
    processedDate?: string;
    depositSlipUrl?: string;
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
  installments?: number;
  monthlyInstallment?: number;
  paidInstallments?: number;
  // Delivery fields
  deliveryStatus: 'pending' | 'assigned' | 'delivered';
  assignedTo?: string; // Delivery Boy ID
  assignedToName?: string; // Delivery Boy Name
  assignedAt?: string;
  deliveredAt?: string;
  // Recovery fields
  recoveryStatus?: 'pending' | 'assigned';
  recoveryOfficerId?: string;
  recoveryOfficerName?: string;
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
  salesmanId: string; // The salesman who made the original token sale OR the user themselves for salary
  salesmanName: string;
  shopManagerName?: string; // The shop manager who made the product sale
  // Source details
  sourceType: 'token_sale' | 'product_sale' | 'salary';
  customerId?: string; // Optional for salary
  customerName?: string; // Optional for salary
  tokenSerial?: string;
  // Optional product details
  productName?: string;
  productPrice?: number;
  paymentMethod?: 'cash' | 'installments';
  installmentNumber?: number;
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

export interface SalarySettings {
  'BUSINESS PROMOTER (stage 01)': number;
  'MARKETING EXECUTIVE (stage 02)': number;
  'Team Operation Manager': number;
  'Group Operation Manager': number;
  'Head Group Manager': number;
}

export interface MonthlySalaryPayout {
    id: string; // YYYY-MM
    payoutDate: string;
    processedBy: string; // Admin User ID
    totalUsersPaid: number;
    totalAmountPaid: number;
}

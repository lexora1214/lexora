

export type Role =
  | "Salesman"
  | "Team Operation Manager"
  | "Group Operation Manager"
  | "Head Group Manager"
  | "Regional Director"
  | "Admin"
  | "Super Admin"
  | "Delivery Boy"
  | "Recovery Officer"
  | "Branch Admin"
  | "HR"
  | "Store Keeper"
  | "Recovery Admin";

export type SalesmanStage = "BUSINESS PROMOTER (stage 01)" | "MARKETING EXECUTIVE (stage 02)";

export interface User {
  id: string;
  name: string;
  email: string;
  mobileNumber: string;
  nic?: string;
  role: Role;
  referrerId: string | null;
  referralCode: string;
  totalIncome: number;
  avatar: string;
  createdAt: string;
  branch?: string;
  salesmanStage?: SalesmanStage | null;
  isDisabled?: boolean;
  assignedManagerIds?: string[];
  // Document verification
  nicFrontUrl?: string;
  nicBackUrl?: string;
  gsCertificateUrl?: string;
  policeReportUrl?: string;
  // Live Location
  liveLocation?: {
    latitude: number;
    longitude: number;
  };
  lastLocationUpdate?: string;
}

export interface Customer {
  id:string;
  name: string;
  nic?: string;
  contactInfo: string;
  address: string;
  tokenSerial: string;
  salesmanId: string;
  saleDate: string;
  commissionStatus: 'pending' | 'approved' | 'rejected';
  tokenIsAvailable: boolean;
  paymentMethod: 'cash' | 'installments';

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
  downPayment?: number | null;
  installments?: number | null;
  monthlyInstallment?: number | null;
  requestedDeliveryDate?: string;
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
    slipGroupId?: string;
}

export interface ProductSale {
  id: string;
  productId: string; // Link to the StockItem ID
  productName: string;
  productCode?: string;
  imei: string;
  price: number;
  paymentMethod: 'cash' | 'installments';
  customerId: string;
  customerName: string;
  tokenSerial: string;
  saleDate: string;
  shopManagerId: string;
  shopManagerName: string;
  installments?: number | null;
  monthlyInstallment?: number | null;
  paidInstallments?: number;
  // Delivery fields
  deliveryStatus: 'pending' | 'assigned' | 'delivered';
  assignedTo?: string; // Delivery Boy ID
  assignedToName?: string; // Delivery Boy Name
  assignedAt?: string;
  deliveredAt?: string;
  requestedDeliveryDate?: string;
  // Recovery fields
  recoveryStatus?: 'pending' | 'assigned';
  recoveryOfficerId?: string;
  recoveryOfficerName?: string;
  nextDueDateOverride?: string;
  arrears?: number; // Number of missed installments
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
  sourceType: 'token_sale' | 'product_sale' | 'salary' | 'incentive' | 'expense';
  customerId?: string; // Optional for salary
  customerName?: string; // Optional for salary
  tokenSerial?: string;
  // Optional product details
  productSaleId?: string;
  productName?: string;
  productPrice?: number;
  paymentMethod?: 'cash' | 'installments';
  installmentNumber?: number;
  // Payout ID for salaries
  payoutId?: string;
  incentiveForRole?: Role | SalesmanStage;
  // Expense details
  expenseDescription?: string;
  managerId?: string;
  managerName?: string;
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
  'Regional Director': number;
}

export interface SalaryChangeRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  newSettings: SalarySettings;
  currentSettings: SalarySettings;
  processedBy?: string;
  processedByName?: string;
  processedDate?: string;
}

export interface MonthlySalaryPayout {
    id: string;
    payoutDate: string;
    processedBy: string;
    processedByName: string;
    totalUsersPaid: number;
    totalAmountPaid: number;
    isReversed?: boolean;
    reversedBy?: string;
    reversedByName?: string;
    reversalDate?: string;
}

export interface SalaryPayoutRequest {
    id: string;
    requesterId: string;
    requesterName: string;
    requestDate: string;
    month: string; // e.g., "2024-07"
    status: 'pending' | 'approved' | 'rejected';
    totalUsersToPay: number;
    totalAmountToPay: number;
    // For processing
    approverId?: string;
    approverName?: string;
    processedDate?: string;
    payoutId?: string; // Link to the actual MonthlySalaryPayout doc
}

export interface StockItem {
  id: string;
  productName: string;
  productCode?: string;
  priceCash: number;
  priceInstallment: number;
  quantity: number;
  branch: string;
  managedBy: string; // Team Operation Manager's ID or Admin ID
  lastUpdatedAt: string;
  imeis?: string[];
}

export interface StockTransferItem {
  productId: string;
  productName: string;
  productCode?: string;
  imeis: string[];
}

export interface StockTransfer {
  id: string;
  fromBranch: 'Main Stock';
  toBranch: string;
  items: StockTransferItem[];
  status: 'pending' | 'completed';
  initiatedById: string;
  initiatedByName: string;
  initiatedAt: string;
  confirmedById?: string;
  confirmedByName?: string;
  confirmedAt?: string;
}

export type IncentiveSetting = {
  target: number;
  incentive: number;
};

export type IncentiveSettings = {
    [key in Role | SalesmanStage]?: IncentiveSetting;
};

export interface IncentiveChangeRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  newSettings: IncentiveSettings;
  currentSettings: IncentiveSettings;
  processedBy?: string;
  processedByName?: string;
  processedDate?: string;
}

export interface Reminder {
  id: string;
  salesmanId: string;
  name: string;
  nic: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  remindDate: string;
  createdAt: string;
  status: 'pending' | 'completed';
}

// Type for the file uploads during salesman registration
export interface SalesmanDocuments {
    nicFront: File;
    nicBack: File;
    gsCertificate: File;
    policeReport: File;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  officerId: string;
  officerName: string;
  note: string;
  createdAt: string;
}

export type Role =
  | "Salesman"
  | "Team Operation Manager"
  | "Group Operation Manager"
  | "Head Group Manager"
  | "Regional Director"
  | "Admin";

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
  customerId: string;
  customerName: string;
  saleDate: string;
  grantedForRole: Role;
  salesmanId: string;
  salesmanName: string;
}

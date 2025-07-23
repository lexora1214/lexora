

"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Bell,
  Briefcase,
  Building,
  DollarSign,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  LogOut,
  Menu,
  Network,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  Users,
  UserPlus,
  Wallet,
  Repeat,
  HandCoins,
  ShieldCheck,
  Signal,
  SignalLow,
  SignalZero,
  Package,
  Boxes,
  Award,
  TrendingUp,
  Map,
  Receipt,
  UserCheck,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { User, Role, Customer, IncomeRecord, ProductSale, CommissionRequest, StockItem, Reminder } from "@/types";
import { getDownlineIdsAndUsers } from "@/lib/hierarchy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import AdminDashboard from "@/components/dashboard/admin-dashboard";
import ManagerDashboard from "@/components/dashboard/manager-dashboard";
import SalesmanDashboard from "@/components/dashboard/salesman-dashboard";
import ShopManagerDashboard from "@/components/dashboard/shop-manager-dashboard";
import UserManagementTable from "@/components/user-management-table";
import CustomerManagementTable from "@/components/customer-management-table";
import NetworkView from "@/components/network-view";
import CommissionSettings from "@/components/commission-settings";
import ActionableInsights from "@/components/actionable-insights";
import TeamView from "@/components/team-view";
import MyCustomersView from "./my-customers-view";
import IncomeRecordsView from "./income-records-view";
import ProductCommissionSettings from "./product-commission-settings";
import SignupRoleSettingsForm from "./signup-role-settings";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ProfileSettingsDialog from "./profile-settings-dialog";
import AddSalesmanView from "./add-salesman-view";
import AddDeliveryBoyView from "./add-delivery-boy-view";
import ManageDeliveriesView from "./manage-deliveries-view";
import DeliveryBoyDashboard from "./delivery-boy-dashboard";
import AddRecoveryOfficerView from "./add-recovery-officer-view";
import ManageRecoveryView from "./manage-recovery-view";
import RecoveryOfficerDashboard from "./recovery-officer-dashboard";
import CommissionApprovalView from "./commission-approval-view";
import SalarySettingsForm from "./salary-settings";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import StockManagementView from "./stock-management-view";
import AdminStockView from "./admin-stock-view";
import IncentiveSettings from "./incentive-settings";
import TargetAchieversView from "./target-achievers-view";
import AddBranchAdminView from "./add-branch-admin-view";
import SlipManagementView from "./slip-management-view";
import RemindersView from "./reminders-view";
import SalesmanVerificationView from "./salesman-verification-view";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: Role[];
  children?: Omit<NavItem, 'children'>[];
};

const navItems: NavItem[] = [
  { href: "#", icon: LayoutDashboard, label: "Dashboard", roles: ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager", "Salesman", "Delivery Boy", "Recovery Officer"] },
  { 
    href: "#", 
    icon: Package, 
    label: "Stock", 
    roles: ["Admin", "Team Operation Manager", "Branch Admin"],
    children: [
      { href: "#", icon: Boxes, label: "Stock Management", roles: ["Team Operation Manager", "Branch Admin"] },
      { href: "#", icon: Package, label: "Global Stock View", roles: ["Admin"] },
    ]
  },
  { href: "#", icon: ShoppingCart, label: "Record Product Sale", roles: ["Team Operation Manager", "Branch Admin"] },
  { href: "#", icon: Wallet, label: "Income Records", roles: ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager", "Salesman"] },
  { href: "#", icon: Users, label: "My Customers", roles: ["Salesman"] },
  { href: "#", icon: Map, label: "Reminders", roles: ["Salesman"] },
  { href: "#", icon: Truck, label: "My Deliveries", roles: ["Delivery Boy"] },
  { href: "#", icon: HandCoins, label: "My Collections", roles: ["Recovery Officer"] },
  { href: "#", icon: Network, label: "Team Performance", roles: ["Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager"] },
  { 
    href: "#", 
    icon: UserPlus, 
    label: "Add Members", 
    roles: ["Team Operation Manager"],
    children: [
      { href: "#", icon: UserPlus, label: "Add Salesman", roles: ["Team Operation Manager"] },
      { href: "#", icon: UserPlus, label: "Add Branch Admin", roles: ["Team Operation Manager"] },
      { href: "#", icon: UserPlus, label: "Add Delivery Boy", roles: ["Team Operation Manager"] },
      { href: "#", icon: UserPlus, label: "Add Recovery Officer", roles: ["Team Operation Manager"] },
    ]
  },
  { href: "#", icon: Truck, label: "Manage Deliveries", roles: ["Team Operation Manager", "Branch Admin"] },
  { href: "#", icon: Repeat, label: "Manage Recovery", roles: ["Team Operation Manager", "Branch Admin"] },
  { href: "#", icon: Building, label: "User Management", roles: ["Admin"] },
  { href: "#", icon: Briefcase, label: "Customer Management", roles: ["Admin"]},
  { href: "#", icon: ShieldCheck, label: "Commission Approvals", roles: ["Admin"] },
  { href: "#", icon: UserCheck, label: "Salesman Verification", roles: ["Admin"] },
  { href: "#", icon: Receipt, label: "Slip Management", roles: ["Admin"] },
  { href: "#", icon: Network, label: "Network View", roles: ["Admin"] },
  { 
    href: "#", 
    icon: TrendingUp, 
    label: "Reports", 
    roles: ["Admin"],
    children: [
      { href: "#", icon: Award, label: "Target Achievers", roles: ["Admin"] },
    ]
  },
  { 
    href: "#", 
    icon: Settings, 
    label: "Settings", 
    roles: ["Admin"],
    children: [
      { href: "#", icon: DollarSign, label: "Token Commissions", roles: ["Admin"] },
      { href: "#", icon: Briefcase, label: "Product Commissions", roles: ["Admin"] },
      { href: "#", icon: Wallet, label: "Salary Management", roles: ["Admin"] },
      { href: "#", icon: Award, label: "Incentive Management", roles: ["Admin"] },
      { href: "#", icon: SlidersHorizontal, label: "Signup Roles", roles: ["Admin"] },
    ]
  },
  { href: "#", icon: Lightbulb, label: "Insights", roles: ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager"] },
];

const SidebarNav = ({ user, activeView, setActiveView, onLinkClick }: { user: User, activeView: string, setActiveView: (view: string) => void, onLinkClick?: () => void }) => (
  <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
    {navItems
      .filter(item => item.roles.includes(user.role))
      .map((item) => {
        if (item.children && item.roles.includes(user.role)) {
          const groupChildren = item.children.filter(child => child.roles.includes(user.role));
          if (groupChildren.length === 0) return null;

          const isGroupActive = groupChildren.some(child => child.label === activeView);
          return (
            <Accordion key={item.label} type="single" collapsible className="w-full" defaultValue={isGroupActive ? item.label : undefined}>
              <AccordionItem value={item.label} className="border-b-0">
                <AccordionTrigger
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:no-underline",
                    isGroupActive && "text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-1 pt-1">
                  {groupChildren.map((child) => (
                    <a
                      key={child.label}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveView(child.label);
                        onLinkClick?.();
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-lg py-2 pl-11 pr-3 text-muted-foreground transition-all hover:text-primary",
                        activeView === child.label && "bg-muted text-primary"
                      )}
                    >
                      <child.icon className="h-4 w-4" />
                      {child.label}
                    </a>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )
        }

        return (
          <a
            key={item.label}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveView(item.label);
              onLinkClick?.();
            }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              activeView === item.label && "bg-muted text-primary"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </a>
        );
      })}
  </nav>
);

const OfflineIndicator = () => {
  const { isOffline, hasPendingWrites } = useOfflineSync();

  if (!isOffline && !hasPendingWrites) return null;

  const getIndicator = () => {
    if (isOffline) {
      return {
        Icon: SignalZero,
        text: "You are currently offline.",
        tooltip: "Data is being saved locally and will sync when you're back online.",
        color: "text-amber-500",
      };
    }
    if (hasPendingWrites) {
      return {
        Icon: SignalLow,
        text: "Syncing pending data...",
        tooltip: "Your locally saved data is being uploaded to the server.",
        color: "text-blue-500 animate-pulse",
      };
    }
    return {
      Icon: Signal,
      text: "Online & Synced",
      tooltip: "Your data is up to date.",
      color: "text-success",
    };
  };

  const { Icon, text, tooltip, color } = getIndicator();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", color)}>
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">{text}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


const AppLayout = ({ user }: { user: User }) => {
  const router = useRouter();
  const [activeView, setActiveView] = React.useState("Dashboard");
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [allCustomers, setAllCustomers] = React.useState<Customer[]>([]);
  const [allIncomeRecords, setAllIncomeRecords] = React.useState<IncomeRecord[]>([]);
  const [allProductSales, setAllProductSales] = React.useState<ProductSale[]>([]);
  const [allCommissionRequests, setAllCommissionRequests] = React.useState<CommissionRequest[]>([]);
  const [allStockItems, setAllStockItems] = React.useState<StockItem[]>([]);
  const [allReminders, setAllReminders] = React.useState<Reminder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    // For Branch Admins, since they don't have a dashboard, set the default view to something they can see.
    if (user.role === 'Branch Admin') {
      setActiveView('Stock Management');
    }
  }, [user.role]);

  React.useEffect(() => {
    const usersUnsub = onSnapshot(collection(db, "users"), { includeMetadataChanges: true }, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setAllUsers(usersData);
      setLoading(false);
    });

    const customersUnsub = onSnapshot(collection(db, "customers"), { includeMetadataChanges: true }, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setAllCustomers(customersData);
    });

    const incomeRecordsUnsub = onSnapshot(collection(db, "incomeRecords"), { includeMetadataChanges: true }, (snapshot) => {
        const incomeRecordsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IncomeRecord));
        setAllIncomeRecords(incomeRecordsData);
    });

    const productSalesUnsub = onSnapshot(collection(db, "productSales"), { includeMetadataChanges: true }, (snapshot) => {
        const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductSale));
        setAllProductSales(salesData);
    });

    const commissionRequestsUnsub = onSnapshot(collection(db, "commissionRequests"), { includeMetadataChanges: true }, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommissionRequest));
      setAllCommissionRequests(requestsData);
    });

    const stockItemsUnsub = onSnapshot(collection(db, "stock"), { includeMetadataChanges: true }, (snapshot) => {
        const stockData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockItem));
        setAllStockItems(stockData);
    });
    
    const remindersUnsub = onSnapshot(query(collection(db, 'reminders'), where('salesmanId', '==', user.id)), { includeMetadataChanges: true }, (snapshot) => {
        const remindersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
        setAllReminders(remindersData);
    });

    return () => {
      usersUnsub();
      customersUnsub();
      incomeRecordsUnsub();
      productSalesUnsub();
      commissionRequestsUnsub();
      stockItemsUnsub();
      remindersUnsub();
    };
  }, [user.id]);


  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    
    switch (activeView) {
      case "Dashboard":
        switch (user.role) {
          case "Admin":
            return <AdminDashboard user={user} allUsers={allUsers} allCustomers={allCustomers} allIncomeRecords={allIncomeRecords} setActiveView={setActiveView} />;
          case "Salesman":
            return <SalesmanDashboard user={user} allCustomers={allCustomers} allIncomeRecords={allIncomeRecords} allCommissionRequests={allCommissionRequests} allStockItems={allStockItems} />;
          case "Team Operation Manager":
            return <ManagerDashboard user={user} allUsers={allUsers} allIncomeRecords={allIncomeRecords} />;
          case "Delivery Boy":
            return <DeliveryBoyDashboard user={user} />;
          case "Recovery Officer":
            return <RecoveryOfficerDashboard user={user} />;
          default:
            return <ManagerDashboard user={user} allUsers={allUsers} allIncomeRecords={allIncomeRecords} />;
        }
      case "Stock Management":
        return <StockManagementView manager={user} />;
      case "Global Stock View":
        return <AdminStockView allStockItems={allStockItems} />;
      case "Record Product Sale":
        return <ShopManagerDashboard user={user} openDialogOnLoad />;
      case "Income Records":
        return <IncomeRecordsView user={user} />;
      case "My Customers":
        return <MyCustomersView user={user} allCustomers={allCustomers} allProductSales={allProductSales} allUsers={allUsers} allStockItems={allStockItems} />;
      case "Reminders":
        return <RemindersView user={user} allReminders={allReminders} />;
      case "My Deliveries":
        return <DeliveryBoyDashboard user={user} />;
      case "My Collections":
        return <RecoveryOfficerDashboard user={user} />;
      case "Team Performance": {
        const { users: downlineUsers } = getDownlineIdsAndUsers(user.id, allUsers);
        return (
          <Card>
            <CardHeader>
              <CardTitle>Team Details</CardTitle>
              <CardDescription>Manage and view performance of your direct and indirect team members.</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamView downlineUsers={downlineUsers} allCustomers={allCustomers} />
            </CardContent>
          </Card>
        );
      }
      case "Add Salesman":
        return <AddSalesmanView manager={user} />;
      case "Add Branch Admin":
        return <AddBranchAdminView manager={user} />;
      case "Add Delivery Boy":
        return <AddDeliveryBoyView manager={user} />;
      case "Add Recovery Officer":
        return <AddRecoveryOfficerView manager={user} />;
      case "Manage Deliveries":
        return <ManageDeliveriesView manager={user} allUsers={allUsers} />;
      case "Manage Recovery":
        return <ManageRecoveryView manager={user} allUsers={allUsers} />;
      case "User Management":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>Manage all employees and system users.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable data={allUsers} allIncomeRecords={allIncomeRecords} />
            </CardContent>
          </Card>
        );
      case "Customer Management":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>View all registered customers in the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerManagementTable data={allCustomers} allUsers={allUsers} allProductSales={allProductSales} />
            </CardContent>
          </Card>
        );
      case "Commission Approvals":
        return <CommissionApprovalView user={user} />;
      case "Salesman Verification":
        return <SalesmanVerificationView allUsers={allUsers} />;
      case "Slip Management":
        return <SlipManagementView allCommissionRequests={allCommissionRequests} />;
      case "Network View":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Organizational Network</CardTitle>
              <CardDescription>View the hierarchical structure of employees.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <NetworkView allUsers={allUsers} />
            </CardContent>
          </Card>
        );
      case "Target Achievers":
        return <TargetAchieversView allUsers={allUsers} allCustomers={allCustomers} />;
      case "Token Commissions":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Token Commission Settings</CardTitle>
              <CardDescription>Adjust commission amounts for each role for the initial LKR 2000 token sale.</CardDescription>
            </CardHeader>
            <CommissionSettings />
          </Card>
        );
      case "Product Commissions":
        return <ProductCommissionSettings />;
      case "Salary Management":
        return <SalarySettingsForm user={user} allCustomers={allCustomers} />;
      case "Incentive Management":
        return <IncentiveSettings />;
      case "Signup Roles":
        return <SignupRoleSettingsForm />;
      case "Insights":
        return <ActionableInsights user={user} allUsers={allUsers} allCustomers={allCustomers} />;
      default:
        return <div>View not found</div>;
    }
  };
  
  return (
    <>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-card md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Link href="/" className="flex items-center gap-2 font-headline font-semibold">
                <Image src="/my-logo.png" alt="LEXORA Logo" width={32} height={32} />
                <span className="">LEXORA</span>
              </Link>
              <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
                <Bell className="h-4 w-4" />
                <span className="sr-only">Toggle notifications</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav user={user} activeView={activeView} setActiveView={setActiveView} />
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
            <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0">
                <div className="flex h-14 items-center border-b px-4">
                  <Link href="/" className="flex items-center gap-2 font-headline font-semibold">
                    <Image src="/my-logo.png" alt="LEXORA Logo" width={32} height={32} />
                    <span className="">LEXORA</span>
                  </Link>
                </div>
                <SidebarNav user={user} activeView={activeView} setActiveView={setActiveView} onLinkClick={() => setIsMobileSheetOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="w-full flex-1">
              <h1 className="font-headline text-xl">{activeView}</h1>
            </div>
            <OfflineIndicator />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="profile avatar" />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                  {user.role === 'Salesman' && user.salesmanStage && (
                    <p className="text-xs text-muted-foreground capitalize pt-1">{user.salesmanStage.toLowerCase()}</p>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsProfileSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                {user.role !== 'Salesman' && <DropdownMenuItem>Your referral code: {user.referralCode}</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto">
            {renderContent()}
          </main>
        </div>
      </div>
      <ProfileSettingsDialog 
        user={user} 
        isOpen={isProfileSettingsOpen} 
        onOpenChange={setIsProfileSettingsOpen} 
      />
    </>
  );
};

export default AppLayout;

"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Users,
  Wallet,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

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
import type { User, Role, Customer } from "@/types";
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

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: Role[];
};

const navItems: NavItem[] = [
  { href: "#", icon: LayoutDashboard, label: "Dashboard", roles: ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager", "Salesman", "Shop Manager"] },
  { href: "#", icon: ShoppingCart, label: "Record Product Sale", roles: ["Shop Manager"] },
  { href: "#", icon: Wallet, label: "Income Records", roles: ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager", "Salesman"] },
  { href: "#", icon: Users, label: "My Customers", roles: ["Salesman"] },
  { href: "#", icon: Network, label: "Team Performance", roles: ["Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager"] },
  { href: "#", icon: Building, label: "User Management", roles: ["Admin"] },
  { href: "#", icon: Briefcase, label: "Customer Management", roles: ["Admin"]},
  { href: "#", icon: Network, label: "Network View", roles: ["Admin"] },
  { href: "#", icon: Settings, label: "Commission Settings", roles: ["Admin"] },
  { href: "#", icon: Lightbulb, label: "Insights", roles: ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager"] },
];

const SidebarNav = ({ user, activeView, setActiveView }: { user: User, activeView: string, setActiveView: (view: string) => void }) => (
  <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
    {navItems
      .filter(item => item.roles.includes(user.role))
      .map((item) => (
        <a
          key={item.label}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveView(item.label);
          }}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            activeView === item.label && "bg-muted text-primary"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </a>
      ))}
  </nav>
);

const AppLayout = ({ user }: { user: User }) => {
  const router = useRouter();
  const [activeView, setActiveView] = React.useState("Dashboard");
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [allCustomers, setAllCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setAllUsers(usersData);
      if(loading) setLoading(false);
    });

    const customersUnsub = onSnapshot(collection(db, "customers"), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setAllCustomers(customersData);
    });

    return () => {
      usersUnsub();
      customersUnsub();
    };
  }, [loading]);


  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    
    switch (activeView) {
      case "Dashboard":
        switch (user.role) {
          case "Admin":
            return <AdminDashboard user={user} allUsers={allUsers} allCustomers={allCustomers} />;
          case "Salesman":
            return <SalesmanDashboard user={user} />;
          case "Shop Manager":
            return <ShopManagerDashboard user={user} onAddNewSale={() => setActiveView("Record Product Sale")} />;
          default:
            return <ManagerDashboard user={user} allUsers={allUsers} />;
        }
      case "Record Product Sale":
        return <ShopManagerDashboard user={user} onAddNewSale={() => setActiveView("Record Product Sale")} openDialogOnLoad />;
      case "Income Records":
        return <IncomeRecordsView user={user} />;
      case "My Customers":
        return <MyCustomersView user={user} />;
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
      case "User Management":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>Manage all employees and system users.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable data={allUsers} />
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
              <CustomerManagementTable data={allCustomers} users={allUsers} />
            </CardContent>
          </Card>
        );
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
      case "Commission Settings":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Commission Settings</CardTitle>
              <CardDescription>Adjust commission amounts for each role.</CardDescription>
            </CardHeader>
            <CommissionSettings />
          </Card>
        );
      case "Insights":
        return <ActionableInsights user={user} allUsers={allUsers} allCustomers={allCustomers} />;
      default:
        return <div>View not found</div>;
    }
  };
  
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-headline font-semibold">
              <DollarSign className="h-6 w-6 text-primary" />
              <span className="">LexoraNet</span>
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
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
               <div className="flex h-14 items-center border-b px-4">
                 <Link href="/" className="flex items-center gap-2 font-headline font-semibold">
                   <DollarSign className="h-6 w-6 text-primary" />
                   <span className="">LexoraNet</span>
                 </Link>
               </div>
              <SidebarNav user={user} activeView={activeView} setActiveView={setActiveView} />
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <h1 className="font-headline text-xl">{activeView}</h1>
          </div>
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
              <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert("Settings clicked!")}>Settings</DropdownMenuItem>
              {user.role !== 'Salesman' && user.role !== 'Shop Manager' && <DropdownMenuItem>Your referral code: {user.referralCode}</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

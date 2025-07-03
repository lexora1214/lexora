"use client";

import React from "react";
import Link from "next/link";
import {
  Bell,
  Building,
  DollarSign,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  User as UserIcon,
  Users,
  Lightbulb,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { User, Role } from "@/types";

import AdminDashboard from "@/components/dashboard/admin-dashboard";
import ManagerDashboard from "@/components/dashboard/manager-dashboard";
import SalesmanDashboard from "@/components/dashboard/salesman-dashboard";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: Role[];
};

const navItems: NavItem[] = [
  { href: "#", icon: LayoutDashboard, label: "Dashboard", roles: ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager", "Salesman"] },
  { href: "#", icon: Users, label: "My Customers", roles: ["Salesman"] },
  { href: "#", icon: Network, label: "Team Performance", roles: ["Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager"] },
  { href: "#", icon: Building, label: "User Management", roles: ["Admin"] },
  { href: "#", icon: Lightbulb, label: "Insights", roles: ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager"] },
];

const SidebarNav = ({ user }: { user: User }) => (
  <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
    {navItems
      .filter(item => item.roles.includes(user.role))
      .map((item, index) => (
        <Link
          key={index}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            index === 0 && "bg-muted text-primary"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
  </nav>
);

const AppLayout = ({ user }: { user: User }) => {
  const renderDashboard = () => {
    switch (user.role) {
      case "Admin":
        return <AdminDashboard user={user} />;
      case "Salesman":
        return <SalesmanDashboard user={user} />;
      default:
        return <ManagerDashboard user={user} />;
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
          <div className="flex-1">
            <SidebarNav user={user} />
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
            <SheetContent side="left" className="flex flex-col">
              <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/" className="flex items-center gap-2 font-headline font-semibold">
                  <DollarSign className="h-6 w-6 text-primary" />
                  <span className="">LexoraNet</span>
                </Link>
              </div>
              <SidebarNav user={user} />
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <h1 className="font-headline text-xl">Dashboard</h1>
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
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {renderDashboard()}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

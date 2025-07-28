

"use client";

import React from "react";
import { User, Customer as CustomerType, IncomeRecord, CommissionRequest, StockItem } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { DollarSign, Users, UserPlus, Calendar as CalendarIcon, Hourglass, LoaderCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomerRegistrationDialog from "@/components/customer-registration-dialog";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import TokenUsagePieChart from "../token-usage-pie-chart";
import { getCommissionSettings, getIncentiveSettings } from "@/lib/firestore";
import PendingApprovalsDialog from "../pending-approvals-dialog";
import { Progress } from "../ui/progress";

interface SalesmanDashboardProps {
  user: User;
  allCustomers: CustomerType[];
  allIncomeRecords: IncomeRecord[];
  allCommissionRequests: CommissionRequest[];
  allStockItems: StockItem[];
}

const SalesmanDashboard: React.FC<SalesmanDashboardProps> = ({ user, allCustomers, allIncomeRecords, allCommissionRequests, allStockItems }) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isPendingApprovalsOpen, setIsPendingApprovalsOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [pendingIncome, setPendingIncome] = React.useState(0);
  const [loadingPending, setLoadingPending] = React.useState(true);
  const [incentiveTarget, setIncentiveTarget] = React.useState(0);
  const [monthlySales, setMonthlySales] = React.useState(0);

  const pendingRequests = allCommissionRequests.filter(
    req => req.salesmanId === user.id && req.status === 'pending'
  );

  React.useEffect(() => {
    const calculatePendingIncome = async () => {
      setLoadingPending(true);
      try {
        const settings = await getCommissionSettings();
        const totalPending = pendingRequests.length * settings.salesman;
        setPendingIncome(totalPending);
      } catch (error) {
        console.error("Error calculating pending income:", error);
        setPendingIncome(0);
      } finally {
        setLoadingPending(false);
      }
    };
    
    calculatePendingIncome();
  }, [allCommissionRequests, user.id, pendingRequests.length]);

  React.useEffect(() => {
    if (user.role !== 'Salesman' || !user.salesmanStage) return;

    const fetchIncentiveData = async () => {
        const incentiveSettings = await getIncentiveSettings();
        const stageSettings = incentiveSettings[user.salesmanStage!];
        if (stageSettings) {
            setIncentiveTarget(stageSettings.target);
        }
    }
    
    const countMonthlySales = () => {
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);

        const salesCount = allCustomers.filter(c => 
            c.salesmanId === user.id &&
            c.commissionStatus === 'approved' &&
            new Date(c.saleDate) >= start &&
            new Date(c.saleDate) <= end
        ).length;

        setMonthlySales(salesCount);
    }

    fetchIncentiveData();
    countMonthlySales();
  }, [user.id, user.role, user.salesmanStage, allCustomers]);


  const filteredData = React.useMemo(() => {
    const myCustomers = allCustomers.filter(c => c.salesmanId === user.id);
    const myIncomeRecords = allIncomeRecords.filter(r => r.userId === user.id);

    if (!dateRange || !dateRange.from) {
      return { filteredCustomers: myCustomers, filteredIncomeRecords: myIncomeRecords };
    }
    const from = dateRange.from;
    const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
    to.setHours(23, 59, 59, 999);

    const filteredCustomers = myCustomers.filter(c => {
        const saleDate = new Date(c.saleDate);
        return saleDate >= from && saleDate <= to;
    });
    
    const filteredIncomeRecords = myIncomeRecords.filter(r => {
        const saleDate = new Date(r.saleDate);
        return saleDate >= from && saleDate <= to;
    });

    return { filteredCustomers, filteredIncomeRecords };

  }, [user.id, allCustomers, allIncomeRecords, dateRange]);

  const { filteredCustomers, filteredIncomeRecords } = filteredData;
  
  const personalIncome = filteredIncomeRecords.reduce((acc, r) => {
    if (r.sourceType === 'expense') {
      return acc - r.amount;
    }
    return acc + r.amount;
  }, 0);

  // Data for the pie chart
  const usedTokens = filteredCustomers.filter(c => !c.tokenIsAvailable).length;
  const availableTokens = filteredCustomers.length - usedTokens;
  const totalTokens = filteredCustomers.length;

  const tokenUsageData = [
    { status: 'Used' as const, count: usedTokens, fill: 'var(--color-Used)' },
    { status: 'Available' as const, count: availableTokens, fill: 'var(--color-Available)' },
  ].filter(item => item.count > 0);
  
  const targetProgress = incentiveTarget > 0 ? (monthlySales / incentiveTarget) * 100 : 0;


  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Popover>
              <PopoverTrigger asChild>
              <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                  "w-full justify-start text-left font-normal md:w-[300px]",
                  !dateRange && "text-muted-foreground"
                  )}
              >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                  dateRange.to ? (
                      <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                      </>
                  ) : (
                      format(dateRange.from, "LLL dd, y")
                  )
                  ) : (
                  <span>Filter by date (All time)</span>
                  )}
              </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
              />
              <div className="p-2 border-t">
                  <Button variant="ghost" className="w-full justify-center" onClick={() => setDateRange(undefined)}>Clear</Button>
              </div>
              </PopoverContent>
          </Popover>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card 
            className={pendingRequests.length > 0 ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
            onClick={() => pendingRequests.length > 0 && setIsPendingApprovalsOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personal Income</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">LKR {personalIncome.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Your accumulated commission for the period</p>
               {loadingPending ? (
                  <div className="flex items-center gap-2 mt-2">
                    <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Loading pending...</span>
                  </div>
              ) : pendingIncome > 0 && (
                  <div className="mt-2 text-sm text-amber-600 flex items-center gap-2 border-t pt-2">
                      <Hourglass className="h-4 w-4" />
                      <div>
                        <p className="font-semibold">LKR {pendingIncome.toLocaleString()}</p>
                        <p className="text-xs">Pending from {pendingRequests.length} sales. Click to upload slips.</p>
                      </div>
                  </div>
              )}
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-2xl font-bold">+{filteredCustomers.length}</div>
              <p className="text-xs text-muted-foreground">Customers registered in the period</p>
            </CardContent>
             <CardFooter>
               <Button className="w-full" onClick={() => setIsDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register New Customer
               </Button>
            </CardFooter>
          </Card>
          <TokenUsagePieChart data={tokenUsageData} totalTokens={totalTokens} />
        </div>
        {user.role === 'Salesman' && incentiveTarget > 0 && (
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Monthly Token Target
                </CardTitle>
                <CardDescription>
                    Your progress for {format(new Date(), 'MMMM yyyy')}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>{monthlySales} / {incentiveTarget} Tokens</span>
                </div>
                <Progress value={targetProgress} className="h-3" />
                 <p className="text-xs text-muted-foreground mt-2">
                    {incentiveTarget - monthlySales > 0 
                        ? `${incentiveTarget - monthlySales} more approved sales to go!`
                        : `Congratulations! You've reached your monthly target.`
                    }
                </p>
            </CardContent>
          </Card>
        )}
      </div>
       <CustomerRegistrationDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        salesman={user}
        stockItems={allStockItems}
        onRegistrationSuccess={() => {}} 
      />
      <PendingApprovalsDialog
        isOpen={isPendingApprovalsOpen}
        onOpenChange={setIsPendingApprovalsOpen}
        requests={pendingRequests}
      />
    </>
  );
};

export default SalesmanDashboard;



    
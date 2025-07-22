
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { User, Customer, SalesmanIncentiveSettings } from '@/types';
import { getSalesmanIncentiveSettings } from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, Award, Target, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfMonth, endOfMonth, format, subMonths, addMonths } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface TargetAchieversViewProps {
  allUsers: User[];
  allCustomers: Customer[];
}

interface SalesmanProgressInfo {
  user: User;
  salesCount: number;
  target: number;
  incentive: number;
  progress: number;
  isAchieved: boolean;
}

const TargetAchieversView: React.FC<TargetAchieversViewProps> = ({ allUsers, allCustomers }) => {
  const [incentiveSettings, setIncentiveSettings] = useState<SalesmanIncentiveSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  useEffect(() => {
    getSalesmanIncentiveSettings()
      .then(setIncentiveSettings)
      .catch(err => console.error("Failed to fetch incentive settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const salesmenProgress = useMemo(() => {
    if (!incentiveSettings) return [];

    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    const salesmen = allUsers.filter(u => u.role === 'Salesman' && u.salesmanStage);
    const progressList: SalesmanProgressInfo[] = [];

    for (const salesman of salesmen) {
      const stageSettings = incentiveSettings[salesman.salesmanStage!];
      if (stageSettings) {
        const salesCount = allCustomers.filter(c =>
          c.salesmanId === salesman.id &&
          c.commissionStatus === 'approved' &&
          new Date(c.saleDate) >= monthStart &&
          new Date(c.saleDate) <= monthEnd
        ).length;
        
        const isAchieved = salesCount >= stageSettings.target;

        progressList.push({
          user: salesman,
          salesCount,
          target: stageSettings.target,
          incentive: isAchieved ? stageSettings.incentive : 0,
          progress: stageSettings.target > 0 ? (salesCount / stageSettings.target) * 100 : 0,
          isAchieved,
        });
      }
    }
    return progressList.sort((a,b) => b.salesCount - a.salesCount);
  }, [allUsers, allCustomers, incentiveSettings, selectedMonth]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <Target className="h-6 w-6 text-primary" />
                    Salesmen Monthly Performance
                </CardTitle>
                <CardDescription>
                    Review token sale targets and achievements for all salesmen.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center font-semibold text-lg w-48">
                    {format(selectedMonth, 'MMMM yyyy')}
                </div>
                <Button variant="outline" size="icon" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} disabled={selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear()}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salesman</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="w-[200px]">Progress</TableHead>
                <TableHead className="text-center">Sales / Target</TableHead>
                <TableHead className="text-right">Incentive Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesmenProgress.length > 0 ? (
                salesmenProgress.map(({ user, salesCount, target, incentive, progress, isAchieved }) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-primary/50">
                          <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="profile avatar" />
                          <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{user.name}</div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{user.salesmanStage}</Badge></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Progress value={progress} className="w-full h-2" />
                            <span className="text-xs font-mono w-10 text-right">{Math.round(progress)}%</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{salesCount} / {target}</TableCell>
                    <TableCell className="text-right">
                        {isAchieved ? (
                            <div className="font-bold text-success flex items-center justify-end gap-2">
                                <Award className="h-4 w-4"/>
                                LKR {incentive.toLocaleString()}
                            </div>
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No salesmen found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TargetAchieversView;

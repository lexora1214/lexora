
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { User, Customer, SalesmanIncentiveSettings } from '@/types';
import { getSalesmanIncentiveSettings } from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, Award, Target } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';

interface TargetAchieversViewProps {
  allUsers: User[];
  allCustomers: Customer[];
}

interface AchieverInfo {
  user: User;
  salesCount: number;
  target: number;
  incentive: number;
}

const TargetAchieversView: React.FC<TargetAchieversViewProps> = ({ allUsers, allCustomers }) => {
  const [incentiveSettings, setIncentiveSettings] = useState<SalesmanIncentiveSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSalesmanIncentiveSettings()
      .then(setIncentiveSettings)
      .catch(err => console.error("Failed to fetch incentive settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const achievers = useMemo(() => {
    if (!incentiveSettings) return [];

    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    const salesmen = allUsers.filter(u => u.role === 'Salesman' && u.salesmanStage);
    const achieverList: AchieverInfo[] = [];

    for (const salesman of salesmen) {
      const stageSettings = incentiveSettings[salesman.salesmanStage!];
      if (stageSettings) {
        const salesCount = allCustomers.filter(c =>
          c.salesmanId === salesman.id &&
          c.commissionStatus === 'approved' &&
          new Date(c.saleDate) >= currentMonthStart &&
          new Date(c.saleDate) <= currentMonthEnd
        ).length;

        if (salesCount >= stageSettings.target) {
          achieverList.push({
            user: salesman,
            salesCount,
            target: stageSettings.target,
            incentive: stageSettings.incentive,
          });
        }
      }
    }
    return achieverList.sort((a,b) => b.salesCount - a.salesCount);
  }, [allUsers, allCustomers, incentiveSettings]);

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
        <CardTitle className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          Monthly Target Achievers
        </CardTitle>
        <CardDescription>
          Salesmen who have met their token sale targets for the month of {format(new Date(), 'MMMM yyyy')}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salesman</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-center">Sales Made</TableHead>
                <TableHead className="text-center">Target</TableHead>
                <TableHead className="text-right">Incentive Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {achievers.length > 0 ? (
                achievers.map(({ user, salesCount, target, incentive }) => (
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
                    <TableCell className="text-center font-semibold">{salesCount}</TableCell>
                    <TableCell className="text-center">{target}</TableCell>
                    <TableCell className="text-right font-bold text-success">
                      LKR {incentive.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No salesmen have reached their target this month yet.
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

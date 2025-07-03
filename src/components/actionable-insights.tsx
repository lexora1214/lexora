"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, LoaderCircle } from "lucide-react";
import { getActionableInsights } from "@/app/actions";
import { User, Customer } from "@/types";
import { getDownlineIdsAndUsers } from "@/lib/hierarchy";

interface ActionableInsightsProps {
    user: User;
    allUsers: User[];
    allCustomers: Customer[];
}

const ActionableInsights: React.FC<ActionableInsightsProps> = ({ user, allUsers, allCustomers }) => {
    const [isPending, startTransition] = useTransition();
    const [insights, setInsights] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateInsights = () => {
        startTransition(async () => {
            setError(null);
            setInsights([]);

            const { users: downlineUsers } = getDownlineIdsAndUsers(user.id, allUsers);
            const teamIncome = downlineUsers.reduce((acc, u) => acc + u.totalIncome, 0);
            const commissionsDue = allCustomers.filter(c => !c.commissionDistributed).length * 400; // Assuming 400 is the manager part
            
            const recentTeamSalesActivities = `Team of ${downlineUsers.length} members generated LKR ${teamIncome}. Recent sales from team members have been steady. ${allCustomers.filter(c => !c.commissionDistributed).length} commissions are pending payout.`;

            const result = await getActionableInsights({
                hierarchicalPosition: user.role,
                commissionsDue: commissionsDue,
                recentTeamSalesActivities: recentTeamSalesActivities,
            });

            if (result.success) {
                setInsights(result.data.insights);
            } else {
                setError(result.error);
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Actionable Insights
                </CardTitle>
                <CardDescription>
                    AI-powered suggestions to improve performance and manage your team.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {insights.length === 0 && !isPending && !error && (
                    <div className="text-center text-sm text-muted-foreground p-4">
                        Click the button to generate insights based on your current team data.
                    </div>
                )}

                {isPending && (
                     <div className="flex items-center justify-center p-4">
                        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                     </div>
                )}
                
                {error && (
                    <div className="text-center text-sm text-destructive p-4">
                       <p><strong>Error:</strong> {error}</p>
                    </div>
                )}

                {insights.length > 0 && (
                    <ul className="space-y-3">
                        {insights.map((insight, index) => (
                            <li key={index} className="flex items-start gap-3 text-sm">
                                <span className="mt-1 block h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                                <span>{insight}</span>
                            </li>
                        ))}
                    </ul>
                )}
                
                <Button onClick={handleGenerateInsights} disabled={isPending} className="w-full mt-4">
                    {isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    {isPending ? "Generating..." : "Generate Insights"}
                </Button>
            </CardContent>
        </Card>
    );
};

export default ActionableInsights;

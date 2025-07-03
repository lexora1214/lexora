"use client";

import React from "react";
import { User } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TeamViewProps {
  downlineUsers: User[];
}

const TeamView: React.FC<TeamViewProps> = ({ downlineUsers }) => {
  if (downlineUsers.length === 0) {
    return <p className="text-muted-foreground">You have no team members in your downline yet.</p>;
  }

  return (
    <div className="rounded-md border">
        <Table>
        <TableHeader>
            <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Income</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {downlineUsers.map((member) => (
            <TableRow key={member.id}>
                <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                    <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="profile avatar" />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-0.5">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                </div>
                </TableCell>
                <TableCell>
                <Badge variant="outline">{member.role}</Badge>
                </TableCell>
                <TableCell className="text-right">LKR {member.totalIncome.toLocaleString()}</TableCell>
            </TableRow>
            ))}
        </TableBody>
        </Table>
    </div>
  );
};

export default TeamView;

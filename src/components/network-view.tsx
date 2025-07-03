"use client";

import React from "react";
import { users as allUsers } from "@/lib/mock-data";
import { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";

interface TreeNodeProps {
  user: User;
  level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ user, level }) => {
  const children = allUsers.filter((u) => u.referrerId === user.id);

  return (
    <div style={{ marginLeft: `${level * 20}px` }}>
      <Card className="mb-2 bg-card/50">
        <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/50">
                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="profile avatar" />
                    <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-medium font-headline">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.role}</p>
                </div>
            </div>
            <Button variant="ghost" size="icon">
                <Edit2 className="h-4 w-4"/>
                <span className="sr-only">Edit user position</span>
            </Button>
        </div>
      </Card>
      {children.length > 0 && (
        <div className="border-l-2 border-primary/20 pl-4">
          {children.map((child) => (
            <TreeNode key={child.id} user={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const NetworkView = () => {
  const rootUsers = allUsers.filter((user) => !user.referrerId);

  return (
    <div className="space-y-4">
      {rootUsers.map((user) => (
        <TreeNode key={user.id} user={user} level={0} />
      ))}
    </div>
  );
};

export default NetworkView;

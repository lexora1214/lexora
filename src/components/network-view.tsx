
"use client";

import React, { useState } from "react";
import { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeNodeProps {
  user: User;
  allUsers: User[];
  level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ user, allUsers, level }) => {
  const children = allUsers.filter((u) => u.referrerId === user.id);
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    if (children.length > 0) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div style={{ marginLeft: `${level * 20}px` }}>
      <Card className="mb-2 bg-card/50">
        <div
          className="flex items-center justify-between p-3"
          onClick={handleToggle}
          style={{ cursor: children.length > 0 ? "pointer" : "default" }}
        >
            <div className="flex items-center gap-3">
                <div className="w-5">
                  {children.length > 0 && (
                    <ChevronRight
                      className={cn("h-5 w-5 transition-transform duration-200", {
                        "rotate-90": isOpen,
                      })}
                    />
                  )}
                </div>
                <Avatar className="h-10 w-10 border-2 border-primary/50">
                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="profile avatar" />
                    <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-medium font-headline">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.role}</p>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <Edit2 className="h-4 w-4"/>
                <span className="sr-only">Edit user position</span>
            </Button>
        </div>
      </Card>
      {isOpen && children.length > 0 && (
        <div className="border-l-2 border-primary/20 pl-4">
          {children.map((child) => (
            <TreeNode key={child.id} user={child} allUsers={allUsers} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

interface NetworkViewProps {
    allUsers: User[];
}

const NetworkView: React.FC<NetworkViewProps> = ({ allUsers }) => {
  const usersInNetwork = allUsers.filter((user) => !['Delivery Boy', 'Recovery Officer'].includes(user.role));
  const rootUsers = usersInNetwork.filter((user) => !user.referrerId || !usersInNetwork.find(u => u.id === user.referrerId));

  return (
    <div className="space-y-4">
      {rootUsers.map((user) => (
        <TreeNode key={user.id} user={user} allUsers={usersInNetwork} level={0} />
      ))}
    </div>
  );
};

export default NetworkView;

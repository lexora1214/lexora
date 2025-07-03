"use client";

import * as React from "react";
import AppLayout from "@/components/app-layout";
import { User, Role } from "@/types";
import { users } from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Home() {
  const [currentUser, setCurrentUser] = React.useState<User>(users[0]);

  const handleUserChange = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <Label htmlFor="user-selector" className="text-sm font-medium">
            Simulate User:
          </Label>
          <Select value={currentUser.id} onValueChange={handleUserChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Use this to switch between different user roles and test the UI.
        </p>
      </div>
      <AppLayout user={currentUser} />
    </>
  );
}

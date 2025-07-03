import { User } from "@/types";
import { users as allUsers } from "@/lib/mock-data";

export function getDownlineIdsAndUsers(userId: string): { ids: string[], users: User[] } {
  const downlineUsers: User[] = [];
  const queue: string[] = [userId];
  const visited: Set<string> = new Set();
  
  // Find initial direct reports
  const directReports = allUsers.filter(u => u.referrerId === userId);
  directReports.forEach(u => {
    if (!visited.has(u.id)) {
      queue.push(u.id);
      visited.add(u.id);
    }
  });

  // BFS to find all downline members
  let head = 1; // Start from after the initial userId
  while (head < queue.length) {
    const currentUserId = queue[head++];
    const currentUser = allUsers.find(u => u.id === currentUserId);
    if(currentUser) {
        downlineUsers.push(currentUser);
    }

    const children = allUsers.filter(u => u.referrerId === currentUserId);
    children.forEach(child => {
      if (!visited.has(child.id)) {
        queue.push(child.id);
        visited.add(child.id);
      }
    });
  }

  const downlineIds = downlineUsers.map(u => u.id);
  
  return { ids: downlineIds, users: downlineUsers };
}



"use client";

import React, { useState, useMemo } from 'react';
import { StockItem, User } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';
import AddGlobalStockDialog from './add-global-stock-dialog';

interface AdminStockViewProps {
  user: User;
  allStockItems: StockItem[];
  allUsers: User[];
}

const AdminStockView: React.FC<AdminStockViewProps> = ({ user, allStockItems, allUsers }) => {
  const [filter, setFilter] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const branches = useMemo(() => {
    const branchSet = new Set(allUsers.map(u => u.branch).filter(Boolean));
    return ['all', 'Main Stock', ...Array.from(branchSet).sort()];
  }, [allUsers]);

  const filteredItems = useMemo(() => {
    return allStockItems
      .filter(item => {
        const branchMatch = selectedBranch === 'all' || item.branch === selectedBranch;
        const filterMatch = !filter || 
                            item.productName.toLowerCase().includes(filter.toLowerCase()) || 
                            item.productCode?.toLowerCase().includes(filter.toLowerCase());
        return branchMatch && filterMatch;
      })
      .sort((a, b) => a.productName.localeCompare(b.productName) || a.branch.localeCompare(b.branch));
  }, [allStockItems, filter, selectedBranch]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                  <CardTitle>Global Stock View</CardTitle>
                  <CardDescription>A complete overview of all stock across all branches.</CardDescription>
              </div>
               <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  <Input
                      placeholder="Filter by name or code..."
                      value={filter}
                      onChange={e => setFilter(e.target.value)}
                      className="w-full md:w-auto"
                  />
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="w-full md:w-[200px]">
                          <SelectValue placeholder="Filter by branch" />
                      </SelectTrigger>
                      <SelectContent>
                          {branches.map(branch => (
                          <SelectItem key={branch} value={branch}>
                              {branch === 'all' ? 'All Branches' : branch}
                          </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  {['Admin', 'Super Admin'].includes(user.role) && (
                      <Button onClick={() => setIsAddDialogOpen(true)}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add to Main Stock
                      </Button>
                  )}
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Price (Cash)</TableHead>
                  <TableHead>Price (Installment)</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.productCode || 'N/A'}</TableCell>
                      <TableCell><Badge variant="outline">{item.branch}</Badge></TableCell>
                      <TableCell>{item.priceCash.toLocaleString()}</TableCell>
                      <TableCell>{item.priceInstallment.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{format(new Date(item.lastUpdatedAt), 'PPP p')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No stock items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <AddGlobalStockDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        adminUser={user}
      />
    </>
  );
};

export default AdminStockView;

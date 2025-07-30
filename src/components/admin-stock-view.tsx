
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
import { PlusCircle, MoreHorizontal, Edit } from 'lucide-react';
import AddGlobalStockDialog from './add-global-stock-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

const ViewImeisDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: StockItem;
}> = ({ isOpen, onOpenChange, item }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>IMEIs for {item.productName}</DialogTitle>
                <DialogDescription>
                    A total of {item.imeis?.length || 0} unique serial numbers.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-72 w-full rounded-md border">
                <div className="p-4 text-sm">
                    {item.imeis && item.imeis.length > 0 ? (
                        <ul className="space-y-2">
                            {item.imeis.map((imei, index) => (
                                <li key={index} className="font-mono bg-muted/50 p-2 rounded-md">{imei}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-center">No IMEI/Serial numbers recorded for this item.</p>
                    )}
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
  )
};

interface AdminStockViewProps {
  user: User;
  allStockItems: StockItem[];
  allUsers: User[];
}

const AdminStockView: React.FC<AdminStockViewProps> = ({ user, allStockItems, allUsers }) => {
  const [filter, setFilter] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewImeisOpen, setIsViewImeisOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | undefined>(undefined);

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
  
  const handleEdit = (item: StockItem) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };
  
  const handleViewImeis = (item: StockItem) => {
    setSelectedItem(item);
    setIsViewImeisOpen(true);
  };

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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.productCode || 'N/A'}</TableCell>
                      <TableCell><Badge variant={item.branch === 'Main Stock' ? 'default' : 'secondary'}>{item.branch}</Badge></TableCell>
                      <TableCell>{(item.priceCash ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{(item.priceInstallment ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{item.lastUpdatedAt ? format(new Date(item.lastUpdatedAt), 'PPP p') : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewImeis(item)}>View IMEIs</DropdownMenuItem>
                                  {user.role === 'Super Admin' && (
                                    <DropdownMenuItem onClick={() => handleEdit(item)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
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
       <AddGlobalStockDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        adminUser={user}
        item={selectedItem}
      />
      {selectedItem && (
        <ViewImeisDialog
          isOpen={isViewImeisOpen}
          onOpenChange={setIsViewImeisOpen}
          item={selectedItem}
        />
      )}
    </>
  );
};

export default AdminStockView;

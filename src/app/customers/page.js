"use client";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCustomers } from "@/contexts/customer-context";
import { useTransactions } from "@/contexts/transaction-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Plus, Search, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { AddCustomerDialog } from "@/components/customers/AddCustomerDialog";
import { EditCustomerDialog } from "@/components/customers/EditCustomerDialog";
import { useToast } from "@/hooks/use-toast";
import logger from "@/utils/logger";

export default function CustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { 
    customers,
    deleteCustomer, 
    updateCustomer 
  } = useCustomers();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  // Removed useTransactions as we rely on customer.financialSummary now
  const getCustomerDue = (customerId) => {
     const customer = customers?.find(c => c.id === customerId);
     return customer?.financialSummary?.totalDue || 0;
  };

  const getCustomerMemoCount = (customerId) => {
     return 0; // Placeholder until we have a way to fetch count efficiently
  };

  // Calculate customer financial stats
  const customerStats = useMemo(() => {
    if (!customers) {
      return {
        totalBill: 0,
        totalDeposit: 0,
        totalDue: 0,
      };
    }

    return customers.reduce(
      (acc, customer) => {
        const summary = customer.financialSummary || {
          totalRevenue: 0,
          totalDeposits: 0,
          totalDue: 0,
        };
        return {
          totalBill: acc.totalBill + (summary.totalRevenue || 0),
          totalDeposit: acc.totalDeposit + (summary.totalDeposits || 0),
          totalDue: acc.totalDue + (summary.totalDue || 0),
        };
      },
      { totalBill: 0, totalDeposit: 0, totalDue: 0 }
    );
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];

    return customers.filter((customer) => {
      if (!customer) return false;
      const searchString = searchTerm.toLowerCase();
      return (
        customer.name?.toLowerCase().includes(searchString) ||
        customer.phone?.toLowerCase().includes(searchString) ||
        customer.address?.toLowerCase().includes(searchString)
      );
    });
  }, [customers, searchTerm]);

  const handleAddClick = () => {
    setEditingCustomer(null);
    setAddDialogOpen(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setEditDialogOpen(true);
  };

  const handleDelete = async (customerId) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteCustomer(customerId);
        toast({
          title: "Success",
          description: "Customer deleted successfully",
        });
      } catch (error) {
        logger.error("Error deleting customer:", error);
        toast({
          title: "Error",
          description: "Failed to delete customer. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRowClick = (customerId) => {
    router.push(`/customers/${customerId}`);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer information and track their transactions
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Customer
        </Button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-none shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-blue-600">
                Total Bill Amount
              </h3>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700">
              ৳{customerStats.totalBill.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Total sales across all customers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-none shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-green-600">
                Total Deposit
              </h3>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700">
              ৳{customerStats.totalDeposit.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 mt-2">
              Total payments received
            </p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-none shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-red-600">
                Total Due Amount
              </h3>
              <DollarSign className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-700">
              ৳{customerStats.totalDue.toLocaleString()}
            </div>
            <p className="text-xs text-red-600 mt-2">
              Outstanding balance to collect
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer List Card */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>
                Showing {filteredCustomers.length} of {customers?.length || 0} customers
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <CustomerTable
            customers={filteredCustomers}
            getCustomerDue={getCustomerDue}
            getCustomerMemoCount={getCustomerMemoCount}
            onRowClick={handleRowClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
      <AddCustomerDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onClose={() => setAddDialogOpen(false)}
      />
      {editingCustomer && (
        <EditCustomerDialog
          customer={editingCustomer}
          onEditCustomer={updateCustomer}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingCustomer(null);
          }}
        />
      )}
    </div>
  );
}

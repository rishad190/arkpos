"use client";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { CustomerTable } from "@/components/CustomerTable";
import { AddCustomerDialog } from "@/components/AddCustomerDialog";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { useToast } from "@/hooks/use-toast";
import logger from "@/utils/logger";

export default function CustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { customers, getCustomerDue, deleteCustomer, updateCustomer } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

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
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-3xl font-bold tracking-tight">
                Customers
              </CardTitle>
              <CardDescription className="mt-1">
                Manage your customer information here.
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Customer
            </Button>
          </div>

          <div className="mt-4">
            <div className="relative max-w-sm">
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

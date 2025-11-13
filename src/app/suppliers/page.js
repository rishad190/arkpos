"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSupplierStore } from "@/store/supplierStore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddSupplierDialog } from "@/components/AddSupplierDialog";
import { EditSupplierDialog } from "@/components/EditSupplierDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToPDF } from "@/utils/export";
import {
  MoreVertical,
  Search,
  Plus,
  Download,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SuppliersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    suppliers,
    supplierTransactions,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useSupplierStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [loadingState, setLoadingState] = useState({
    initial: true,
    actions: false,
  });

  // Initialize loading state
  useEffect(() => {
    if (suppliers !== undefined) {
      setLoadingState((prev) => ({ ...prev, initial: false }));
    }
  }, [suppliers]);

  // Memoize filtered suppliers and totals
  const { filteredSuppliers, totals } = useMemo(() => {
    const filtered =
      suppliers?.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.phone.includes(searchTerm)
      ) || [];

    const totals = filtered.reduce(
      (acc, supplier) => {
        const supplierTxns =
          supplierTransactions?.filter((t) => t.supplierId === supplier.id) ||
          [];

        const supplierTotal = supplierTxns.reduce(
          (txnAcc, transaction) => ({
            totalAmount:
              txnAcc.totalAmount + (Number(transaction.totalAmount) || 0),
            paidAmount:
              txnAcc.paidAmount + (Number(transaction.paidAmount) || 0),
          }),
          { totalAmount: 0, paidAmount: 0 }
        );

        acc.totalAmount += supplierTotal.totalAmount;
        acc.paidAmount += supplierTotal.paidAmount;
        acc.dueAmount = acc.totalAmount - acc.paidAmount;

        // Avoid mutating original supplier object. Compute per-supplier due and
        // attach it to a new object when rendering if needed.
        // Store computed due in a temporary map for potential use elsewhere.
        acc.supplierDues = acc.supplierDues || {};
        acc.supplierDues[supplier.id] =
          supplierTotal.totalAmount - supplierTotal.paidAmount;

        return acc;
      },
      { totalAmount: 0, paidAmount: 0, dueAmount: 0 }
    );

    // Map filtered suppliers to include computed totalDue without mutating source
    const filteredWithDue = filtered.map((s) => ({
      ...s,
      totalDue: totals.supplierDues?.[s.id] ?? s.totalDue ?? 0,
    }));

    return { filteredSuppliers: filteredWithDue, totals };
  }, [suppliers, supplierTransactions, searchTerm]);

  const handleAddSupplier = async (supplierData) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      const newSupplier = {
        ...supplierData,
        totalDue: 0,
        createdAt: new Date().toISOString(),
      };
      await addSupplier(newSupplier);
      toast({
        title: "Success",
        description: "Supplier added successfully",
      });
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast({
        title: "Error",
        description: "Failed to add supplier. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleDeleteSupplier = async (e, supplierId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this supplier?")) {
      return;
    }

    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await deleteSupplier(supplierId);
      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({
        title: "Error",
        description: "Failed to delete supplier. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleEditSupplier = async (supplierId, updatedData) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await updateSupplier(supplierId, updatedData);
      setEditingSupplier(null);
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
    } catch (error) {
      console.error("Error updating supplier:", error);
      toast({
        title: "Error",
        description: "Failed to update supplier. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleExportCSV = () => {
    const data = filteredSuppliers.map((s) => ({
      Name: s.name,
      Phone: s.phone,
      Email: s.email,
      Address: s.address,
      Store: s.storeId,
      "Total Due": s.totalDue || 0,
    }));
    exportToCSV(data, "suppliers-report.csv");
  };

  const handleExportPDF = () => {
    const data = {
      title: "Suppliers Report",
      date: new Date().toLocaleDateString(),
      suppliers: filteredSuppliers,
      summary: totals,
    };
    exportToPDF(data, "suppliers-report.pdf");
  };

  // Loading skeleton components
  const SummaryCardSkeleton = () => (
    <Card className="overflow-hidden border-none shadow-md">
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
        <div className="p-4">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );

  const TableSkeleton = () => (
    <Card className="border-none shadow-md">
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (loadingState.initial) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>

        {/* Table */}
        <TableSkeleton />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all supplier information
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
            <AddSupplierDialog onAddSupplier={handleAddSupplier}>
              <Button
                className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white"
                disabled={loadingState.actions}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </AddSupplierDialog>
            <Button
              onClick={handleExportPDF}
              className="w-full md:w-auto"
              variant="outline"
              disabled={loadingState.actions}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button
              onClick={handleExportCSV}
              className="w-full md:w-auto"
              variant="outline"
              disabled={loadingState.actions}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="overflow-hidden border-none shadow-md">
            <CardContent className="p-0">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border-b border-blue-100 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Total Amount
                  </h3>
                  <ArrowUpRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="p-4">
                <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                  ৳{totals.totalAmount.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                  All time transactions
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-md">
            <CardContent className="p-0">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 border-b border-green-100 dark:border-green-800">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                    Total Paid
                  </h3>
                  <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="p-4">
                <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                  ৳{totals.paidAmount.toLocaleString()}
                </p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                  All time payments
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-md">
            <CardContent className="p-0">
              <div
                className={`${
                  totals.dueAmount > 0
                    ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
                    : "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800"
                } p-4 border-b`}
              >
                <div className="flex justify-between items-center">
                  <h3
                    className={`text-sm font-medium ${
                      totals.dueAmount > 0
                        ? "text-red-800 dark:text-red-300"
                        : "text-green-800 dark:text-green-300"
                    }`}
                  >
                    Total Due
                  </h3>
                  <RefreshCw
                    className={`h-4 w-4 ${
                      totals.dueAmount > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  />
                </div>
              </div>
              <div className="p-4">
                <p
                  className={`text-2xl md:text-3xl font-bold ${
                    totals.dueAmount > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  ৳{totals.dueAmount.toLocaleString()}
                </p>
                <p
                  className={`text-xs ${
                    totals.dueAmount > 0
                      ? "text-red-600/70 dark:text-red-400/70"
                      : "text-green-600/70 dark:text-green-400/70"
                  } mt-1`}
                >
                  Current balance
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Section */}
        <Card className="mb-8 border-none shadow-md">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Suppliers Table */}
        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead className="text-right">Total Due</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/suppliers/${supplier.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{supplier.name}</div>
                    </TableCell>
                    <TableCell>
                      <div>{supplier.phone}</div>
                      <div className="text-sm text-gray-500">
                        {supplier.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="truncate max-w-[200px]"
                        title={supplier.address}
                      >
                        {supplier.address}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{supplier.storeId}</Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        supplier.totalDue > 0
                          ? "text-red-500"
                          : "text-green-500"
                      }`}
                    >
                      ৳{(supplier.totalDue || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSupplier(supplier);
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/suppliers/${supplier.id}`);
                              }}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-500"
                              onClick={(e) =>
                                handleDeleteSupplier(e, supplier.id)
                              }
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredSuppliers.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No suppliers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Supplier Dialog */}
        {editingSupplier && (
          <EditSupplierDialog
            supplier={editingSupplier}
            isOpen={!!editingSupplier}
            onClose={() => setEditingSupplier(null)}
            onEditSupplier={handleEditSupplier}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

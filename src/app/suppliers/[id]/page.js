"use client";
import { useParams, useRouter } from "next/navigation";
import logger from "@/utils/logger";
import { useState, useMemo, useEffect } from "react";
import { useInventory } from "@/contexts/inventory-context";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  ArrowLeft,
  ArrowDownToLine,
  Phone,
  Mail,
  Store,
  DollarSign,
  CreditCard,
  FileText,
  Printer,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddSupplierTransactionDialog } from "@/components/inventory/AddSupplierTransactionDialog";
import { formatDate } from "@/lib/utils";
import { EditSupplierTransactionDialog } from "@/components/inventory/EditSupplierTransactionDialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToPDF } from "@/utils/export";
import { DataErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";

export default function SupplierDetail() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { 
    suppliers, 
    supplierTransactions,
    updateSupplier, 
    addSupplierTransaction,
    updateSupplierTransaction,
    deleteSupplierTransaction 
  } = useInventory();

  const [storeFilter, setStoreFilter] = useState("all");
  const [loading, setLoading] = useState({
    action: false,
  });

  const supplier = useMemo(() => 
    suppliers?.find(s => s.id === params.id), 
    [suppliers, params.id]
  );

  const allTransactions = useMemo(() => 
    supplierTransactions?.filter(t => t.supplierId === params.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date)) || [],
    [supplierTransactions, params.id]
  );

  const transactions = useMemo(() => 
    allTransactions.filter(t => storeFilter === "all" || t.storeId === storeFilter),
    [allTransactions, storeFilter]
  );

  useEffect(() => {
    if (suppliers.length > 0 && !supplier) {
      toast({
        title: "Error",
        description: "Supplier not found",
        variant: "destructive",
      });
      router.push("/suppliers");
    }
  }, [supplier, suppliers, router, toast]);

  if (!supplier) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
  }

  const handleExportCSV = () => {
    const data = transactionsWithBalance.map((t) => ({
      Date: formatDate(t.date),
      Invoice: t.invoiceNumber,
      Details: t.details,
      Total: `${t.totalAmount.toLocaleString()}`,
      Paid: `${t.paidAmount.toLocaleString()}`,
      Due: `${t.due.toLocaleString()}`,
      Balance: `${t.cumulativeBalance.toLocaleString()}`,
      Store: t.storeId,
    }));
    exportToCSV(data, `${supplier?.name}-transactions-${params.id}.csv`);
  };

  const handleAddTransaction = async (transaction) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }));
      
      const transactionData = {
        ...transaction,
        supplierId: params.id,
      };

      await addSupplierTransaction(transactionData);

      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
    } catch (error) {
      logger.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleDeleteTransaction = async (transactionId, amount, paidAmount) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }));
      const dueAmount = amount - (paidAmount || 0);
      if (
        window.confirm(
          `Are you sure you want to delete this transaction?\nThis will reduce the total due by ৳${dueAmount.toLocaleString()}`
        )
      ) {
        await deleteSupplierTransaction(
          transactionId,
          params.id,
          amount,
          paidAmount
        );
        toast({
          title: "Success",
          description: "Transaction deleted successfully",
        });
      }
    } catch (error) {
      logger.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleEditTransaction = async (transactionId, updatedData) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }));
      
      await updateSupplierTransaction(transactionId, updatedData);

      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  if (!supplier) {
    // Should be handled by useEffect redirect, but for safety
     return null;
  }

  // Update the transactionsWithBalance calculation
  // Compute cumulative balances using the complete chronological set of supplier transactions
  const cumulativeMap = allTransactions.reduce((map, txn) => {
    const prevBalance = map.lastBalance || 0;
    const due = (txn.totalAmount || 0) - (txn.paidAmount || 0);
    const newBalance = prevBalance + due;
    map.byId = map.byId || {};
    map.byId[txn.id] = newBalance;
    map.lastBalance = newBalance;
    return map;
  }, {});

  // Attach computed cumulative balance to the visible (possibly filtered) transactions
  const transactionsWithBalance = transactions.map((transaction) => ({
    ...transaction,
    due: (transaction.totalAmount || 0) - (transaction.paidAmount || 0),
    cumulativeBalance: cumulativeMap.byId?.[transaction.id] ?? 0,
  }));

  // Diagnostic: compute derived total due from allTransactions and compare with supplier.totalDue
  const derivedTotalDue = allTransactions.reduce((sum, t) => {
    const total = Number(t.totalAmount) || 0;
    const paid = Number(t.paidAmount) || 0;
    return sum + (total - paid);
  }, 0);

  if (typeof supplier?.totalDue !== "undefined") {
    if (Math.abs((derivedTotalDue || 0) - (supplier.totalDue || 0)) > 0.001) {
      console.warn(
        "Supplier totalDue mismatch:",
        { supplierId: params.id },
        { supplierTotalDue: supplier.totalDue },
        { computedTotalDue: derivedTotalDue },
        { lastCumulative: cumulativeMap.lastBalance ?? 0 }
      );
    }
  }

  const handleFixTotalDue = async () => {
    if (!window.confirm("Update stored Total Due to computed value?")) return;
    try {
      setLoading((prev) => ({ ...prev, action: true }));
      await updateSupplier(params.id, {
        ...supplier,
        totalDue: derivedTotalDue,
        updatedAt: new Date().toISOString(),
      });
      toast({
        title: "Success",
        description: "Supplier totalDue updated to computed value",
      });
    } catch (error) {
      console.error("Failed to update supplier totalDue:", error);
      toast({
        title: "Error",
        description: "Failed to update supplier totalDue",
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };



  return (
    <DataErrorBoundary>
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              Supplier Details
            </h1>
          </div>
          <p className="text-muted-foreground">
            View and manage supplier information and transactions
          </p>
        </div>
      </div>

      {/* Supplier Info and Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Supplier Info Card */}
        <Card className="lg:col-span-1 overflow-hidden border-none shadow-md">
          <CardHeader className="bg-primary text-primary-foreground pb-4">
            <div className="flex justify-between items-start">
              <CardTitle>Supplier Profile</CardTitle>
              <Badge
                variant="secondary"
                className="bg-primary-foreground text-primary"
              >
                ID: {params.id}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center mb-6">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="text-xl">
                  {supplier.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold text-center">
                {supplier.name}
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{supplier.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{supplier.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span>Store ID: {supplier.storeId}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card className="lg:col-span-2 border-none shadow-md">
          <CardHeader className="bg-muted pb-4">
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>
              Overview of suppliers financial status
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-blue-600">
                      Total Amount
                    </span>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    ৳
                    {transactions
                      .reduce((sum, t) => sum + (t.totalAmount || 0), 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-600">
                      Total Paid
                    </span>
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    ৳
                    {transactions
                      .reduce((sum, t) => sum + (t.paidAmount || 0), 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`${
                  supplier.totalDue > 0 ? "bg-red-50" : "bg-green-50"
                } border-none shadow-sm`}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-sm font-medium ${
                        supplier.totalDue > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      Total Due
                    </span>
                    <FileText
                      className={`h-4 w-4 ${
                        supplier.totalDue > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    />
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      supplier.totalDue > 0 ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    ৳{supplier.totalDue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t">
              <select
                className="w-full sm:w-[180px] border rounded-md px-4 py-2"
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
              >
                <option value="all">All Stores</option>
                <option value="STORE1">Store 1</option>
                <option value="STORE2">Store 2</option>
              </select>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() =>
                    exportToPDF(supplier, transactionsWithBalance, "supplier")
                  }
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>

                <AddSupplierTransactionDialog
                  supplierId={params.id}
                  onAddTransaction={handleAddTransaction}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      {typeof supplier?.totalDue !== "undefined" &&
        Math.abs((derivedTotalDue || 0) - (supplier.totalDue || 0)) > 0.001 && (
          <div className="mb-4 p-4 rounded-md bg-yellow-50 border border-yellow-200 text-sm flex items-start justify-between gap-4">
            <div>
              <strong>Warning:</strong> Computed total from transactions ( ৳
              {derivedTotalDue.toLocaleString()}) does not match stored Total
              Due ( ৳{(supplier.totalDue || 0).toLocaleString()}). Difference: ৳
              {(derivedTotalDue - (supplier.totalDue || 0)).toLocaleString()}
            </div>
            <div className="flex-shrink-0">
              <button
                className="inline-flex items-center px-3 py-1.5 bg-primary text-white rounded-md"
                onClick={handleFixTotalDue}
                disabled={loading.action}
              >
                Fix Total Due
              </button>
            </div>
          </div>
        )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Date</TableHead>
              <TableHead className="whitespace-nowrap">
                Invoice Number
              </TableHead>
              <TableHead className="whitespace-nowrap">Details</TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Total Amount
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Paid Amount
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Due Amount
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Balance
              </TableHead>
              <TableHead className="whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading.transactions ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : transactionsWithBalance.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactionsWithBalance.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {transaction.invoiceNumber}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {transaction.details}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    ৳{(transaction.totalAmount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    ৳{(transaction.paidAmount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-red-500">
                    ৳{(transaction.due || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap text-red-500">
                    ৳{transaction.cumulativeBalance.toLocaleString()}
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
                          <DropdownMenuItem asChild>
                            <EditSupplierTransactionDialog
                              transaction={transaction}
                              onSave={handleEditTransaction}
                            />
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this transaction?"
                                )
                              ) {
                                handleDeleteTransaction(
                                  transaction.id,
                                  transaction.totalAmount,
                                  transaction.paidAmount
                                );
                              }
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Update the footer section */}
      <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-sm text-gray-500">
          Total Transactions: {transactionsWithBalance.length}
        </div>
        <div className="bg-gray-100 p-4 rounded-lg w-full md:w-auto">
          <span className="font-semibold">Current Balance: </span>
          <span
            className={`font-bold ${
              supplier.totalDue > 0 ? "text-red-500" : "text-green-500"
            }`}
          >
            ৳{supplier.totalDue.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
    </DataErrorBoundary>
  );
}

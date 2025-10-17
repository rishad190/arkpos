"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddSupplierTransactionDialog } from "@/components/AddSupplierTransactionDialog.jsx";
import { EditSupplierTransactionDialog } from "@/components/EditSupplierTransactionDialog.jsx";
import { TableSkeleton } from "@/components/LoadingState.jsx";
import { ErrorBoundary } from "@/components/ErrorBoundary.jsx";
import {
  ArrowLeft,
  Phone,
  Mail,
  Store,
  MoreVertical,
  DollarSign,
  CreditCard,
  FileText,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate, exportToCSV } from "@/lib/utils";
import { TRANSACTION_CONSTANTS, ERROR_MESSAGES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/DateRangePicker.jsx";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

export default function SupplierDetail() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const {
    suppliers,
    supplierTransactions,
    addSupplierTransaction,
    updateSupplierTransaction,
    deleteSupplierTransaction,
  } = useData();

  const [loadingState, setLoadingState] = useState({
    initial: true,
    transactions: true,
    action: false,
  });
  const [storeFilter, setStoreFilter] = useState(
    TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL
  );
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const supplier = suppliers?.find((s) => s.id === params.id);

  const supplierTransactionsWithBalance = useMemo(() => {
    if (!supplierTransactions) return [];
    return supplierTransactions
      .filter((t) => t.supplierId === params.id)
      .filter(
        (t) =>
          storeFilter === TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL ||
          t.storeId === storeFilter
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .reduce((acc, transaction) => {
        const previousBalance =
          acc.length > 0 ? acc[acc.length - 1].cumulativeBalance : 0;
        const due =
          (transaction.totalAmount || 0) - (transaction.paidAmount || 0);
        return [
          ...acc,
          { ...transaction, due, cumulativeBalance: previousBalance + due },
        ];
      }, []);
  }, [supplierTransactions, params.id, storeFilter]);

  useEffect(() => {
    if (supplier && supplierTransactions)
      setLoadingState({ initial: false, transactions: false, action: false });
  }, [supplier, supplierTransactions]);

  const handleAddTransaction = async (data) => {
    try {
      setLoadingState((s) => ({ ...s, action: true }));
      await addSupplierTransaction({
        ...data,
        supplierId: params.id,
      });
      toast({ title: "Success", description: "Transaction added" });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: ERROR_MESSAGES.ADD_ERROR,
        variant: "destructive",
      });
    } finally {
      setLoadingState((s) => ({ ...s, action: false }));
    }
  };

  const handleEditTransaction = async (id, updated) => {
    try {
      setLoadingState((s) => ({ ...s, action: true }));
      await updateSupplierTransaction(id, updated);
      toast({ title: "Success", description: "Transaction updated" });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: ERROR_MESSAGES.UPDATE_ERROR,
        variant: "destructive",
      });
    } finally {
      setLoadingState((s) => ({ ...s, action: false }));
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      setLoadingState((s) => ({ ...s, action: true }));
      await deleteSupplierTransaction(id);
      toast({ title: "Success", description: "Transaction deleted" });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: ERROR_MESSAGES.DELETE_ERROR,
        variant: "destructive",
      });
    } finally {
      setLoadingState((s) => ({ ...s, action: false }));
    }
  };

  const handleExportCSV = () => {
    const data = supplierTransactionsWithBalance.map((t) => ({
      Date: new Date(t.date).toLocaleDateString("en-GB").replace(/\//g, "-"),
      Invoice: t.invoiceNumber,
      Details: t.details,
      Total: `${t.totalAmount || 0}`,
      Paid: `${t.paidAmount || 0}`,
      Due: `${t.due || 0}`,
      Balance: `${t.cumulativeBalance || 0}`,
      Store: t.storeId,
    }));
    exportToCSV(
      data,
      `${supplier?.name || "supplier"}-transactions-${params.id}.csv`
    );
  };

  const filteredTransactions = useMemo(() => {
    if (!supplierTransactionsWithBalance) return [];
    return supplierTransactionsWithBalance.filter((t) => {
      const matchesSearch =
        !searchTerm ||
        t.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.details?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate =
        !dateRange.from ||
        !dateRange.to ||
        (new Date(t.date) >= dateRange.from &&
          new Date(t.date) <= dateRange.to);
      return matchesSearch && matchesDate;
    });
  }, [supplierTransactionsWithBalance, searchTerm, dateRange]);

  const { totalAmount, totalPaid, totalDue } = useMemo(() => {
    return supplierTransactionsWithBalance.reduce(
      (acc, t) => {
        acc.totalAmount += t.totalAmount || 0;
        acc.totalPaid += t.paidAmount || 0;
        return acc;
      },
      { totalAmount: 0, totalPaid: 0, totalDue: supplier?.totalDue || 0 }
    );
  }, [supplierTransactionsWithBalance, supplier]);

  if (loadingState.initial)
    return (
      <div className="h-[80vh]">
        <TableSkeleton />
      </div>
    );
  if (!supplier)
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Supplier not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.back()}
        >
          Go Back
        </Button>
      </div>
    );

  return (
    <ErrorBoundary>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Supplier Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
                  <AvatarFallback>
                    {supplier.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold text-center">
                  {supplier.name}
                </h2>
              </div>
              <div className="space-y-3">
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
                  <span>Store: {supplier.storeId}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-md">
            <CardHeader className="bg-muted pb-4">
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>
                Overview of supplier's financial status
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
                      ৳{totalAmount.toLocaleString()}
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
                      ৳{totalPaid.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className={`${
                    totalDue > 0 ? "bg-red-50" : "bg-green-50"
                  } border-none shadow-sm`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span
                        className={`text-sm font-medium ${
                          totalDue > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        Total Due
                      </span>
                      <FileText
                        className={`h-4 w-4 ${
                          totalDue > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      />
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        totalDue > 0 ? "text-red-700" : "text-green-700"
                      }`}
                    >
                      ৳{totalDue.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>
                  A list of all transactions for this supplier.
                </CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <AddSupplierTransactionDialog
                  onAddTransaction={handleAddTransaction}
                >
                  <Button size="sm" className="w-full">
                    Add Transaction
                  </Button>
                </AddSupplierTransactionDialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="w-full"
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <Input
                placeholder="Search by invoice or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingState.transactions ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length ? (
                    filteredTransactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>{formatDate(txn.date)}</TableCell>
                        <TableCell>{txn.invoiceNumber}</TableCell>
                        <TableCell>{txn.details}</TableCell>
                        <TableCell className="text-right">
                          ৳{(txn.totalAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ৳{(txn.paidAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ৳{(txn.due || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ৳{(txn.cumulativeBalance || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>{txn.storeId}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                data-radix-dropdown-menu-trigger
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() => {
                                  requestAnimationFrame(() =>
                                    setEditingTransaction(txn)
                                  );
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-500"
                                onSelect={() => {
                                  requestAnimationFrame(() =>
                                    setDeleteTarget(txn)
                                  );
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {editingTransaction && (
          <EditSupplierTransactionDialog
            transaction={editingTransaction}
            onSave={(id, data) => handleEditTransaction(id, data)}
            open={!!editingTransaction}
            onOpenChange={(open) => !open && setEditingTransaction(null)}
          />
        )}

        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this transaction. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteTarget) handleDeleteTransaction(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ErrorBoundary>
  );
}

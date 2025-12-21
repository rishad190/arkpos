"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCustomers } from "@/contexts/customer-context";
import { useTransactions } from "@/contexts/transaction-context";
import { CustomerMemoList } from "@/components/customers/CustomerMemoList";
import { MemoDetailsDialog } from "@/components/transactions/MemoDetailsDialog";
import { AddPaymentDialog } from "@/components/transactions/AddPaymentDialog";

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
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog";
import { LoadingState, TableSkeleton } from "@/components/shared/LoadingState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import {
  ArrowLeft,
  Phone,
  Mail,
  Store,
  DollarSign,
  CreditCard,
  FileText,
  MoreVertical,
  Tag,
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
import { formatDate } from "@/lib/utils";
import { exportToCSV, exportToPDF } from "@/utils/export";
import { TRANSACTION_CONSTANTS, ERROR_MESSAGES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { ERROR_TYPES } from "@/lib/errors";

export default function CustomerDetail() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { customers } = useCustomers();
  const {
    transactions: globalTransactions, // Renamed to avoid confusion, though we won't use it for the list
    addTransaction,
    deleteTransaction,
    updateTransaction,
    addPaymentToMemo,
    subscribeToCustomerTransactions,
  } = useTransactions();

  // Local state for full customer history
  const [customerTransactions, setCustomerTransactions] = useState([]);

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
  const [viewMode, setViewMode] = useState("transactions"); // "transactions" or "memos"
  const [selectedMemo, setSelectedMemo] = useState(null);
  const [showMemoDetails, setShowMemoDetails] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [error, setError] = useState(null);

  const customer = customers?.find((c) => c.id === params.id);

  // Subscribe to customer transactions
  useEffect(() => {
    if (params.id) {
      setLoadingState(prev => ({ ...prev, transactions: true }));
      const unsubscribe = subscribeToCustomerTransactions(params.id, (data) => {
        setCustomerTransactions(data);
        setLoadingState(prev => ({ ...prev, transactions: false }));
      });
      return () => unsubscribe();
    }
  }, [params.id, subscribeToCustomerTransactions]);

  // Get memo groups for this customer (derived from local transactions)
  // Note: getCustomerTransactionsByMemo in context might use global transactions.
  // We should either update it to accept transactions or implement it locally.
  // Checking TransactionService.. getCustomerTransactionsByMemo accepts (customerId, allTransactions).
  // So we can use the context helper BUT pass our local customerTransactions!
  const customerMemoGroups = useMemo(() => {
    if (!params.id) return [];
    // We need to pass the LOCAL customerTransactions, but the context hook `getCustomerTransactionsByMemo`
    // binds `transactions` from context already in the context provider?
    // Let's check context. 
    // const getCustomerTransactionsByMemo = useCallback((customerId) => {
    //   return transactionService.getCustomerTransactionsByMemo(customerId, transactions);
    // }, [transactionService, transactions]);
    // It binds GLOBAL transactions. So we cannot use the context helper for full history!
    // We must manually call the service method or reimplement logic.
    // The cleanest way is to import TransactionService (class) or move logic to a utility.
    // Or... update context to allow passing transactions?
    // Let's implement memo grouping locally here since we have the raw data.
    
    // Quick local implementation of memo grouping:
    const memoMap = new Map();
    customerTransactions.forEach((t) => {
       if (!t.memoNumber) return;
       if (!memoMap.has(t.memoNumber)) {
         memoMap.set(t.memoNumber, {
           memoNumber: t.memoNumber,
           customerId: params.id,
           saleTransaction: null,
           paymentTransactions: [],
           totalAmount: 0,
           paidAmount: 0,
           dueAmount: 0,
           saleDate: null,
           status: 'unpaid'
         });
       }
       const group = memoMap.get(t.memoNumber);
       const type = t.type?.toLowerCase();
       if (type === 'sale' || !t.type) {
         group.saleTransaction = t;
         group.totalAmount = t.total || 0;
         group.saleDate = t.date || t.createdAt;
         group.paidAmount = t.deposit || 0;
       } else if (type === 'payment') {
         group.paymentTransactions.push(t);
         group.paidAmount += t.deposit || t.amount || 0;
       }
    });

    return Array.from(memoMap.values()).map(memo => {
      memo.dueAmount = memo.totalAmount - memo.paidAmount;
      if (memo.dueAmount <= 0) memo.status = 'paid';
      else if (memo.paidAmount > 0) memo.status = 'partial';
      else memo.status = 'unpaid';
      return memo;
    }).sort((a,b) => new Date(b.saleDate || 0) - new Date(a.saleDate || 0));

  }, [params.id, customerTransactions]);

  const customerTransactionsWithBalance = useMemo(() => {
    if (!customerTransactions) return [];

    return customerTransactions
      .filter(
        (t) =>
          storeFilter === TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL ||
          t.storeId === storeFilter
      )
      .sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        return dateA - dateB; // Sort by date ascending (oldest to newest)
      })
      .reduce((acc, transaction) => {
        const previousBalance =
          acc.length > 0 ? acc[acc.length - 1].cumulativeBalance : 0;
        
        // Calculate balance change based on transaction type
        let balanceChange = 0;
        const transactionType = transaction.type?.toLowerCase();
        
        if (transactionType === 'payment') {
          // Payment transactions reduce the balance
          balanceChange = -(transaction.amount || transaction.deposit || 0);
        } else {
          // Sale transactions (or transactions without type) add to balance
          balanceChange = transaction.due || 0;
        }
        
        return [
          ...acc,
          {
            ...transaction,
            cumulativeBalance: previousBalance + balanceChange,
          },
        ];
      }, []);
  }, [customerTransactions, params.id, storeFilter]);

  useEffect(() => {
    if (customer && !loadingState.transactions) {
      setLoadingState((prev) => ({
        ...prev,
        initial: false,
      }));
    }
  }, [customer, loadingState.transactions]);

  const handleAddTransaction = async (transactionData) => {
    try {
      setLoadingState((prev) => ({ ...prev, action: true }));
      setError(null);
      await addTransaction({
        ...transactionData,
        customerId: params.id,
        date: new Date().toISOString(),
      });
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
    } catch (error) {
      console.error(ERROR_MESSAGES.ADD_ERROR, error);
      setError({
        type: ERROR_TYPES.NETWORK,
        message: error.message || ERROR_MESSAGES.ADD_ERROR,
      });
      toast({
        title: "Error",
        description: error.message || ERROR_MESSAGES.ADD_ERROR,
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, action: false }));
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    try {
      setLoadingState((prev) => ({ ...prev, action: true }));
      setError(null);
      await deleteTransaction(transactionId);
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (error) {
      console.error(ERROR_MESSAGES.DELETE_ERROR, error);
      setError({
        type: ERROR_TYPES.NETWORK,
        message: error.message || ERROR_MESSAGES.DELETE_ERROR,
      });
      toast({
        title: "Error",
        description: error.message || ERROR_MESSAGES.DELETE_ERROR,
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, action: false }));
    }
  };

  const handleEditTransaction = async (transactionId, updatedData) => {
    try {
      setLoadingState((prev) => ({ ...prev, action: true }));
      setError(null);

      if (!transactionId) {
        throw new Error("Transaction ID is required");
      }

      const trimmedMemo = updatedData.memoNumber?.trim();
      const totalAmount = parseFloat(updatedData.total);
      const depositAmount = parseFloat(updatedData.deposit);

      if (isNaN(totalAmount) || isNaN(depositAmount)) {
        throw new Error("Invalid amount values");
      }

      const processedData = {
        ...updatedData,
        memoNumber: trimmedMemo,
        total: totalAmount,
        deposit: depositAmount,
        due: totalAmount - depositAmount,
        customerId: params.id,
        id: transactionId,
        updatedAt: new Date().toISOString(),
      };

      await updateTransaction(transactionId, processedData);
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
    } catch (error) {
      console.error(ERROR_MESSAGES.UPDATE_ERROR, error);
      setError({
        type: error.message?.includes("Invalid") ? ERROR_TYPES.VALIDATION : ERROR_TYPES.NETWORK,
        message: error.message || ERROR_MESSAGES.UPDATE_ERROR,
      });
      toast({
        title: "Error",
        description: error.message || ERROR_MESSAGES.UPDATE_ERROR,
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, action: false }));
    }
  };

  const handleExportCSV = () => {
    const data = customerTransactionsWithBalance.map((t) => ({
      Date: new Date(t.date)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "-"),
      Memo: t.memoNumber,
      Details: t.details,
      Total: `${t.total.toLocaleString()}`,
      Deposit: `${t.deposit.toLocaleString()}`,
      Due: `${t.due.toLocaleString()}`,
      Balance: `${t.cumulativeBalance.toLocaleString()}`,
      Store: t.storeId,
    }));
    exportToCSV(data, `${customer?.name}-transactions-${params.id}.csv`);
  };

  // Handle memo click - show details dialog
  const handleMemoClick = (memo) => {
    // The memo object from customerMemoGroups already has all the data we need
    // Transform it to match the MemoDetailsDialog expected format
    const memoDetails = {
      memoNumber: memo.memoNumber,
      saleTransaction: memo.saleTransaction,
      paymentTransactions: memo.paymentTransactions || [],
      totalAmount: memo.totalAmount || 0,
      totalPaid: memo.paidAmount || 0,
      remainingDue: memo.dueAmount || 0,
      status: memo.status || 'unpaid'
    };
    
    if (!memoDetails.saleTransaction) {
      toast({
        title: "Error",
        description: "Could not load memo details. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedMemo(memoDetails);
    setShowMemoDetails(true);
  };

  // Handle add payment button click
  const handleAddPaymentClick = (memo) => {
    // Transform memo data to match expected format
    const memoDetails = {
      memoNumber: memo.memoNumber,
      saleTransaction: memo.saleTransaction,
      paymentTransactions: memo.paymentTransactions || [],
      totalAmount: memo.totalAmount || 0,
      totalPaid: memo.paidAmount || 0,
      remainingDue: memo.dueAmount || 0,
      status: memo.status || 'unpaid'
    };
    
    setSelectedMemo(memoDetails);
    setShowAddPayment(true);
  };

  // Handle payment submission
  const handleAddPayment = async (paymentData) => {
    try {
      setLoadingState((prev) => ({ ...prev, action: true }));
      setError(null);
      await addPaymentToMemo(
        selectedMemo.memoNumber,
        paymentData,
        params.id
      );
      toast({
        title: "Success",
        description: "Payment added successfully",
      });
      setShowAddPayment(false);
      setSelectedMemo(null);
    } catch (error) {
      console.error("Error adding payment:", error);
      setError({
        type: ERROR_TYPES.NETWORK,
        message: error.message || "Failed to add payment",
      });
      toast({
        title: "Error",
        description: error.message || "Failed to add payment",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, action: false }));
    }
  };

  const TransactionFilters = () => (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex-1">
        <Input
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      <DateRangePicker
        value={dateRange}
        onChange={setDateRange}
        className="w-full md:w-[300px]"
      />
    </div>
  );

  const filteredTransactions = useMemo(() => {
    if (!customerTransactionsWithBalance) return [];

    return customerTransactionsWithBalance.filter((transaction) => {
      const matchesSearch =
        transaction.memoNumber
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        transaction.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.total?.toString().includes(searchTerm) ||
        transaction.deposit?.toString().includes(searchTerm);

      const matchesDate =
        !dateRange.from ||
        !dateRange.to ||
        (new Date(transaction.date) >= dateRange.from &&
          new Date(transaction.date) <= dateRange.to);

      return matchesSearch && matchesDate;
    });
  }, [customerTransactionsWithBalance, searchTerm, dateRange]);

  const paymentProgress = useMemo(() => {
    if (!customerTransactionsWithBalance.length) return 0;
    const totalBill = customerTransactionsWithBalance.reduce(
      (sum, t) => sum + (t.total || 0),
      0
    );
    const totalDeposit = customerTransactionsWithBalance.reduce(
      (sum, t) => sum + (t.deposit || 0),
      0
    );
    return (totalDeposit / totalBill) * 100;
  }, [customerTransactionsWithBalance]);

  const totalDue =
    customerTransactionsWithBalance.length > 0
      ? customerTransactionsWithBalance[
          customerTransactionsWithBalance.length - 1
        ].cumulativeBalance
      : 0;

  return (
    <ErrorBoundary>
      {loadingState.initial ? (
        <LoadingState
          title="Customer Details"
          description="Loading customer information..."
        />
      ) : !customer ? (
        <div className="p-8 text-center">
          <p className="text-red-500">Customer not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </div>
      ) : (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <div className="w-full sm:w-auto">
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
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Customer Details
                </h1>
              </div>
              <p className="text-sm text-muted-foreground ml-10">
                View and manage customer information and transactions
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6">
              <ErrorDisplay
                errorType={error.type}
                message={error.message}
                onDismiss={() => setError(null)}
                onRetry={() => {
                  setError(null);
                  window.location.reload();
                }}
              />
            </div>
          )}

          {/* Customer Info and Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Customer Info Card */}
            <Card className="lg:col-span-1 overflow-hidden border-none shadow-md">
              <CardHeader className="bg-primary text-primary-foreground pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle>Customer Profile</CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-primary-foreground text-primary"
                  >
                    ID: {params.id}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col items-center mb-4 sm:mb-6">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 mb-3 sm:mb-4">
                    <AvatarFallback className="text-lg sm:text-xl">
                      {customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl sm:text-2xl font-bold text-center">
                    {customer.name}
                  </h2>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm sm:text-base break-all">{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm sm:text-base break-all">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm sm:text-base">Store ID: {customer.storeId}</span>
                  </div>
                </div>

                {/* Fabric Preferences Tags */}
                {customer.tags && customer.tags.length > 0 && (
                  <div className="mt-4 sm:mt-6 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
                        Fabric Preferences
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {customer.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs sm:text-sm font-normal"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary Card */}
            <Card className="lg:col-span-2 border-none shadow-md">
              <CardHeader className="bg-muted pb-4">
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>
                  Overview of customer&apos;s financial status
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <Card className="bg-blue-50 border-none shadow-sm">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex justify-between items-center mb-1 sm:mb-2">
                        <span className="text-xs sm:text-sm font-medium text-blue-600">
                          Total Bill
                        </span>
                        <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-blue-700">
                        ৳
                        {customerTransactionsWithBalance
                          .reduce((sum, t) => sum + (t.total || 0), 0)
                          .toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 border-none shadow-sm">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex justify-between items-center mb-1 sm:mb-2">
                        <span className="text-xs sm:text-sm font-medium text-green-600">
                          Total Deposit
                        </span>
                        <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-green-700">
                        ৳
                        {customerTransactionsWithBalance
                          .reduce((sum, t) => sum + (t.deposit || 0), 0)
                          .toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`${
                      totalDue > 0 ? "bg-red-50" : "bg-green-50"
                    } border-none shadow-sm`}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex justify-between items-center mb-1 sm:mb-2">
                        <span
                          className={`text-xs sm:text-sm font-medium ${
                            totalDue > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          Total Due
                        </span>
                        <FileText
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                            totalDue > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        />
                      </div>
                      <div
                        className={`text-xl sm:text-2xl font-bold ${
                          totalDue > 0 ? "text-red-700" : "text-green-700"
                        }`}
                      >
                        ৳{totalDue.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-4 sm:mt-6 pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs sm:text-sm font-medium">
                      Payment Progress
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {paymentProgress.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={paymentProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {paymentProgress >= 100 ? "Fully Paid" : "Partially Paid"}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 border-t">
                  <select
                    className="w-full sm:w-[180px] border rounded-md px-3 sm:px-4 py-2 text-sm"
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                  >
                    <option value={TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL}>
                      All Stores
                    </option>
                    <option value={TRANSACTION_CONSTANTS.STORE_OPTIONS.STORE1}>
                      Store 1
                    </option>
                    <option value={TRANSACTION_CONSTANTS.STORE_OPTIONS.STORE2}>
                      Store 2
                    </option>
                  </select>
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button
                      variant="outline"
                      onClick={handleExportCSV}
                      disabled={loadingState.action}
                      className="w-full sm:w-auto text-sm"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Export CSV</span>
                      <span className="sm:hidden">CSV</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const validTransactions =
                          customerTransactionsWithBalance.filter(
                            (t) =>
                              t.total !== null &&
                              !isNaN(t.total) &&
                              t.deposit !== null &&
                              !isNaN(t.deposit)
                          );
                        if (validTransactions.length === 0) {
                          toast({
                            title: "No Data to Export",
                            description:
                              "There are no valid transactions to export.",
                            variant: "destructive",
                          });
                          return;
                        }
                        exportToPDF(
                          customer,
                          validTransactions,
                          "customer"
                        );
                      }}
                      disabled={loadingState.action}
                      className="w-full sm:w-auto text-sm"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Export PDF</span>
                      <span className="sm:hidden">PDF</span>
                    </Button>
                    <AddTransactionDialog
                      customerId={params.id}
                      onAddTransaction={handleAddTransaction}
                      isLoading={loadingState.action}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* View Mode Toggle */}
          <div className="mb-4 sm:mb-6">
            <div className="flex gap-2 w-full">
              <Button
                variant={viewMode === "memos" ? "default" : "outline"}
                onClick={() => setViewMode("memos")}
                className="flex-1 sm:flex-none text-sm"
              >
                <FileText className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Memo View</span>
                <span className="sm:hidden">Memos</span>
              </Button>
              <Button
                variant={viewMode === "transactions" ? "default" : "outline"}
                onClick={() => setViewMode("transactions")}
                className="flex-1 sm:flex-none text-sm"
              >
                <span className="hidden sm:inline">Transaction List</span>
                <span className="sm:hidden">Transactions</span>
              </Button>
            </div>
          </div>

          {/* Memo View */}
          {viewMode === "memos" && (
            <>
              <CustomerMemoList
                memoGroups={customerMemoGroups}
                onMemoClick={handleMemoClick}
                onAddPayment={handleAddPaymentClick}
                showOnlyDues={false}
              />
              
              {/* Memo Details Dialog */}
              <MemoDetailsDialog
                open={showMemoDetails}
                onOpenChange={setShowMemoDetails}
                memoDetails={selectedMemo}
                onAddPayment={() => {
                  setShowMemoDetails(false);
                  setShowAddPayment(true);
                }}
              />

              {/* Add Payment Dialog */}
              <AddPaymentDialog
                open={showAddPayment}
                onOpenChange={setShowAddPayment}
                memoNumber={selectedMemo?.memoNumber}
                remainingDue={selectedMemo?.remainingDue || 0}
                onAddPayment={handleAddPayment}
                isLoading={loadingState.action}
              />
            </>
          )}

          {/* Transactions Table */}
          {viewMode === "transactions" && (
            <Card className="border-none shadow-md">
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold">Transactions</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      View and manage customer transactions
                    </p>
                  </div>
                  <TransactionFilters />
                </div>

                {/* Table View */}
                <div className="relative">
                  <div className="overflow-x-auto overflow-y-auto max-h-[400px] sm:max-h-[500px] md:max-h-[600px] -mx-3 sm:mx-0">
                    <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap text-xs sm:text-sm">Date</TableHead>
                      <TableHead className="whitespace-nowrap text-xs sm:text-sm">
                        Memo Number
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs sm:text-sm">
                        Details
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap text-xs sm:text-sm">
                        Total Bill
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap text-xs sm:text-sm">
                        Deposit
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap text-xs sm:text-sm">
                        Due Amount
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap text-xs sm:text-sm">
                        Balance
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs sm:text-sm">Store</TableHead>
                      <TableHead className="whitespace-nowrap text-xs sm:text-sm">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingState.transactions ? (
                      <TableSkeleton />
                    ) : (
                      filteredTransactions.map((transaction) => {
                        const isPayment = transaction.type?.toLowerCase() === 'payment';
                        const paymentAmount = transaction.amount || transaction.deposit || 0;
                        
                        return (
                        <TableRow key={transaction.id} className={isPayment ? "bg-green-50/50" : ""}>
                          <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                            {new Date(transaction.date)
                              .toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                              .replace(/\//g, "-")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                            {transaction.memoNumber}
                            {isPayment && (
                              <span className="ml-1 sm:ml-2 text-xs text-green-600 font-medium">
                                (Payment)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                            {transaction.details || (isPayment ? transaction.note || 'Payment received' : '-')}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm">
                            {isPayment ? '-' : `৳${transaction.total.toLocaleString()}`}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm">
                            {isPayment ? (
                              <span className="text-green-600 font-medium">
                                ৳{paymentAmount.toLocaleString()}
                              </span>
                            ) : (
                              `৳${transaction.deposit.toLocaleString()}`
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm">
                            {isPayment ? '-' : `৳${transaction.due.toLocaleString()}`}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium whitespace-nowrap text-xs sm:text-sm ${
                              transaction.cumulativeBalance > 0
                                ? "text-red-500"
                                : "text-green-500"
                            }`}
                          >
                            ৳{transaction.cumulativeBalance.toLocaleString()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                            {transaction.storeId || '-'}
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
                                    <EditTransactionDialog
                                      transaction={transaction}
                                      onEditTransaction={(updatedData) =>
                                        handleEditTransaction(
                                          transaction.id,
                                          updatedData
                                        )
                                      }
                                      isLoading={loadingState.action}
                                    />
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        className="text-red-500"
                                        onSelect={(e) => e.preventDefault()}
                                        disabled={loadingState.action}
                                      >
                                        Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Are you sure?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action cannot be undone. This
                                          will permanently delete the
                                          transaction.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteTransaction(
                                              transaction.id
                                            )
                                          }
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer Section */}
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-gray-500">
              Total Transactions: {filteredTransactions.length}
            </div>
            <div className="bg-gray-100 p-3 sm:p-4 rounded-lg w-full sm:w-auto">
              <span className="text-sm sm:text-base font-semibold">Current Balance: </span>
              <span
                className={`text-sm sm:text-base font-bold ${
                  totalDue > 0 ? "text-red-500" : "text-green-500"
                }`}
              >
                ৳{totalDue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}

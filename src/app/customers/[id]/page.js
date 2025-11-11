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
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/EditTransactionDialog";
import { LoadingState, TableSkeleton } from "@/components/LoadingState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import { DateRangePicker } from "@/components/DateRangePicker";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CustomerDetail() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const {
    customers,
    transactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    getCustomerDue,
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

  const customer = customers?.find((c) => c.id === params.id);

  const customerTransactionsWithBalance = useMemo(() => {
    if (!transactions) return [];

    return transactions
      .filter((t) => t.customerId === params.id)
      .filter(
        (t) =>
          storeFilter === TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL ||
          t.storeId === storeFilter
      )
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB; // Sort by date ascending (oldest to newest)
      })
      .reduce((acc, transaction) => {
        const previousBalance =
          acc.length > 0 ? acc[acc.length - 1].cumulativeBalance : 0;
        return [
          ...acc,
          {
            ...transaction,
            cumulativeBalance: previousBalance + (transaction.due || 0),
          },
        ];
      }, []);
  }, [transactions, params.id, storeFilter]);

  useEffect(() => {
    if (customer && transactions) {
      setLoadingState((prev) => ({
        ...prev,
        initial: false,
        transactions: false,
      }));
    }
  }, [customer, transactions]);

  const handleAddTransaction = async (transactionData) => {
    try {
      setLoadingState((prev) => ({ ...prev, action: true }));
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
      toast({
        title: "Error",
        description: ERROR_MESSAGES.ADD_ERROR,
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, action: false }));
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    try {
      setLoadingState((prev) => ({ ...prev, action: true }));
      await deleteTransaction(transactionId);
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (error) {
      console.error(ERROR_MESSAGES.DELETE_ERROR, error);
      toast({
        title: "Error",
        description: ERROR_MESSAGES.DELETE_ERROR,
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, action: false }));
    }
  };

  const handleEditTransaction = async (transactionId, updatedData) => {
    try {
      setLoadingState((prev) => ({ ...prev, action: true }));

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
                  Customer Details
                </h1>
              </div>
              <p className="text-muted-foreground">
                View and manage customer information and transactions
              </p>
            </div>
          </div>

          {/* Customer Info and Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
              <CardContent className="pt-6">
                <div className="flex flex-col items-center mb-6">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarFallback className="text-xl">
                      {customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-bold text-center">
                    {customer.name}
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span>Store ID: {customer.storeId}</span>
                  </div>
                </div>

                {/* Fabric Preferences Tags */}
                {customer.tags && customer.tags.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Fabric Preferences
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {customer.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-sm font-normal"
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
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50 border-none shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-blue-600">
                          Total Bill
                        </span>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-blue-700">
                        ৳
                        {customerTransactionsWithBalance
                          .reduce((sum, t) => sum + (t.total || 0), 0)
                          .toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 border-none shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-green-600">
                          Total Deposit
                        </span>
                        <CreditCard className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-700">
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

                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      Payment Progress
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {paymentProgress.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={paymentProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {paymentProgress >= 100 ? "Fully Paid" : "Partially Paid"}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t">
                  <select
                    className="w-full sm:w-[180px] border rounded-md px-4 py-2"
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
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={handleExportCSV}
                      disabled={loadingState.action}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Export CSV
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
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Export PDF
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

          {/* Transactions Table */}
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Transactions</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    View and manage customer transactions
                  </p>
                </div>
                <TransactionFilters />
              </div>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Memo Number
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Details
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        Total Bill
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        Deposit
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        Due Amount
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        Balance
                      </TableHead>
                      <TableHead className="whitespace-nowrap">Store</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingState.transactions ? (
                      <TableSkeleton />
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(transaction.date)
                              .toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                              .replace(/\//g, "-")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {transaction.memoNumber}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {transaction.details}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            ৳{transaction.total.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            ৳{transaction.deposit.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            ৳{transaction.due.toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium whitespace-nowrap ${
                              transaction.cumulativeBalance > 0
                                ? "text-red-500"
                                : "text-green-500"
                            }`}
                          >
                            ৳{transaction.cumulativeBalance.toLocaleString()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {transaction.storeId}
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Footer Section */}
          <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-sm text-gray-500">
              Total Transactions: {filteredTransactions.length}
            </div>
            <div className="bg-gray-100 p-4 rounded-lg w-full md:w-auto">
              <span className="font-semibold">Current Balance: </span>
              <span
                className={`font-bold ${
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

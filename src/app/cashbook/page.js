"use client";
import { useState, useEffect, useMemo } from "react";
import { useData } from "@/app/data-context";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CashTransactionDialog } from "@/components/CashTransactionDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Search,
  Calendar,
  Printer,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  X,
  RefreshCw,
  Download,
  FileText,
  BarChart3,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";

export default function CashBookPage() {
  const {
    dailyCashTransactions,
    addDailyCashTransaction,
    updateDailyCashTransaction,
    deleteDailyCashTransaction,
    getExpenseCategories,
    updateExpenseCategories,
  } = useData();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [yearFilter, setYearFilter] = useState(() => {
    return new Date().getFullYear().toString();
  });
  const [monthFilter, setMonthFilter] = useState(() => {
    return (new Date().getMonth() + 1).toString().padStart(2, "0");
  });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("daily"); // daily, monthly, yearly
  const [loadingState, setLoadingState] = useState({
    initial: true,
    transactions: false,
    actions: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState([]);

  // Load expense categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categories = await getExpenseCategories();
        setExpenseCategories(categories);
      } catch (error) {
        console.error("Error loading categories:", error);
        toast({
          title: "Error",
          description: "Failed to load expense categories",
          variant: "destructive",
        });
      }
    };
    loadCategories();
  }, [getExpenseCategories, toast]);

  // Add useEffect to handle initial loading state
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Wait for dailyCashTransactions to be available
        if (dailyCashTransactions !== undefined) {
          setLoadingState((prev) => ({ ...prev, initial: false }));
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast({
          title: "Error",
          description: "Failed to load data. Please refresh the page.",
          variant: "destructive",
        });
        setLoadingState((prev) => ({ ...prev, initial: false }));
      }
    };

    initializeData();
  }, [dailyCashTransactions, toast]);

  // Add debug logging
  useEffect(() => {
<<<<<<< HEAD
    console.log("Loading state:", loadingState);
    console.log("Daily cash transactions:", dailyCashTransactions);
=======
    if (process.env.NODE_ENV === "development") {
      console.log("Loading state:", loadingState);
      console.log("Daily cash transactions:", dailyCashTransactions);
    }
>>>>>>> feat/performance-and-bug-fixes
  }, [loadingState, dailyCashTransactions]);

  // Memoize calculations for better performance
  const { dailyCash, financials, monthlyTotals } = useMemo(() => {
<<<<<<< HEAD
    const dailySummary = dailyCashTransactions.reduce((acc, item) => {
=======
    const transactions = dailyCashTransactions || [];

    // Return empty data if no valid transactions
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return {
        dailyCash: [],
        financials: { totalCashIn: 0, totalCashOut: 0, availableCash: 0 },
        monthlyTotals: [],
      };
    }

    const dailySummary = {};
    let totalCashIn = 0;
    let totalCashOut = 0;
    const monthly = {};

    // Process transactions once for all calculations
    dailyCashTransactions.forEach((item) => {
      // Daily summary calculation
>>>>>>> feat/performance-and-bug-fixes
      const date = item.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          cashIn: 0,
          cashOut: 0,
          balance: 0,
          dailyCash: [],
        };
      }

      // Handle bank deposits and withdrawals
      if (item.transactionType === "bank_deposit") {
        acc[date].cashIn += item.cashIn || 0;
      } else if (item.transactionType === "bank_withdrawal") {
        acc[date].cashOut += item.cashOut || 0;
      } else {
        acc[date].cashIn += item.cashIn || 0;
        acc[date].cashOut += item.cashOut || 0;
      }

<<<<<<< HEAD
      acc[date].balance = acc[date].cashIn - acc[date].cashOut;
      acc[date].dailyCash.push(item);
=======
      dailySummary[date].balance =
        dailySummary[date].cashIn - dailySummary[date].cashOut;
      dailySummary[date].dailyCash.push(item);
>>>>>>> feat/performance-and-bug-fixes

      return acc;
    }, {});

    const dailyCash = Object.values(dailySummary).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

<<<<<<< HEAD
=======
    // Convert daily summary to sorted array
    const dailyCash = Object.values(dailySummary).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // Calculate financial summary
>>>>>>> feat/performance-and-bug-fixes
    const financials = {
      totalCashIn: dailyCashTransactions.reduce(
        (sum, t) => sum + (t.cashIn || 0),
        0
      ),
      totalCashOut: dailyCashTransactions.reduce(
        (sum, t) => sum + (t.cashOut || 0),
        0
      ),
      availableCash: dailyCashTransactions.reduce(
        (sum, t) => sum + ((t.cashIn || 0) - (t.cashOut || 0)),
        0
      ),
    };

    const monthly = dailyCashTransactions.reduce((acc, transaction) => {
      const month = transaction.date.substring(0, 7);
      if (!acc[month]) {
        acc[month] = { cashIn: 0, cashOut: 0 };
      }

      // Handle bank deposits and withdrawals in monthly totals
      if (transaction.transactionType === "bank_deposit") {
        acc[month].cashIn += transaction.cashIn || 0;
      } else if (transaction.transactionType === "bank_withdrawal") {
        acc[month].cashOut += transaction.cashOut || 0;
      } else {
        acc[month].cashIn += transaction.cashIn || 0;
        acc[month].cashOut += transaction.cashOut || 0;
      }

      return acc;
    }, {});

    const monthlyTotals = Object.entries(monthly)
      .map(([month, totals]) => ({
        month,
        ...totals,
        balance: totals.cashIn - totals.cashOut,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return { dailyCash, financials, monthlyTotals };
  }, [dailyCashTransactions]);
  // Filter transactions based on search term, date, active tab, year, category, and view mode
  const filteredCash = useMemo(() => {
    return dailyCash.filter((day) => {
      const matchesSearch = searchTerm
        ? day.dailyCash.some((t) =>
            t.description.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : true;

      // Skip date filter check when in monthly or yearly view
      const matchesDate =
        viewMode === "daily"
          ? dateFilter
            ? day.date === dateFilter
            : true
          : true;

      const matchesYear = yearFilter ? day.date.startsWith(yearFilter) : true;

      const matchesCategory =
        categoryFilter !== "all"
          ? day.dailyCash.some((t) => t.category === categoryFilter)
          : true;

      const matchesTab = (() => {
        switch (activeTab) {
          case "in":
            return day.cashIn > 0;
          case "out":
            return day.cashOut > 0;
          default:
            return true;
        }
      })();

      // Apply view mode filtering
      const matchesViewMode = (() => {
        const currentDate = new Date(day.date);

        switch (viewMode) {
          case "daily":
            return true; // Date filter is handled above
          case "monthly": {
            const transactionMonth = (currentDate.getMonth() + 1)
              .toString()
              .padStart(2, "0");
            const transactionYear = currentDate.getFullYear().toString();
            return (
              transactionMonth === monthFilter && transactionYear === yearFilter
            );
          }
          case "yearly":
            return currentDate.getFullYear().toString() === yearFilter;
          default:
            return true;
        }
      })();

      return (
        matchesSearch &&
        matchesDate &&
        matchesTab &&
        matchesYear &&
        matchesCategory &&
        matchesViewMode
      );
    });
  }, [
    dailyCash,
    searchTerm,
    dateFilter,
    activeTab,
    yearFilter,
    monthFilter,
    categoryFilter,
    viewMode,
  ]);

  const handleAddTransaction = async (transaction) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await addDailyCashTransaction(transaction);
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleEditTransaction = async (transactionId, updatedData) => {
    try {
      // Update in Firebase and context state
      await updateDailyCashTransaction(transactionId, updatedData);

      // Reset editing state
      setEditingTransaction(null);

      // Show success message
      toast({
        title: "Success",
        description: "Transaction updated successfully",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast({
        title: "Error",
        description: "Failed to update transaction. Please try again.",
        variant: "destructive",
      });

      // Re-open the dialog on error
      setEditingTransaction((prev) => prev);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    setTransactionToDelete(transactionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;

    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      // First delete from Firebase
      await deleteDailyCashTransaction(transactionToDelete);

      // Then update the local state using the setter from useData hook
      const updatedTransactions = dailyCashTransactions.filter(
        (transaction) => transaction.id !== transactionToDelete
      );
      setDailyCashTransactions(updatedTransactions);

      // Show success message
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
        duration: 2000,
      });

      // Reset dialog and transaction states after successful deletion
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleExportCSV = () => {
    const data = dailyCashTransactions.map((t) => ({
      Date: formatDate(t.date),
      Description: t.description,
      "Cash In": t.cashIn || 0,
      "Cash Out": t.cashOut || 0,
      Balance: (t.cashIn || 0) - (t.cashOut || 0),
    }));
    exportToCSV(data, "cashbook-report.csv");
  };

  const handleExportPDF = () => {
    const data = {
      title: "Cash Book Report",
      date: new Date().toLocaleDateString(),
      transactions: dailyCashTransactions,
      summary: financials,
    };
    exportToPDF(data, "cashbook-report.pdf");
  };

  // Add this new function for printing
  const handlePrint = () => {
    setIsPrinting(true);
    const printWindow = window.open("", "_blank");
    const content = document.getElementById("printable-content");

    if (printWindow && content) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cash Book Report</title>
            <style>
              body { font-family: Arial, sans-serif; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .summary { margin-bottom: 20px; }
              .summary-item { margin: 10px 0; }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>Cash Book Report</h1>
            <div class="summary">
              <div class="summary-item">Total Cash In: ৳${financials.totalCashIn.toLocaleString()}</div>
              <div class="summary-item">Total Cash Out: ৳${financials.totalCashOut.toLocaleString()}</div>
              <div class="summary-item">Available Balance: ৳${financials.availableCash.toLocaleString()}</div>
            </div>
            ${content.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      setIsPrinting(false);
    }
  };

  // Handle adding new expense category
  const handleAddCategory = async (newCategory) => {
    try {
      // Update local state
      const updatedCategories = [...expenseCategories, newCategory];
      setExpenseCategories(updatedCategories);

      // Update in Firebase
      await updateExpenseCategories(updatedCategories);

      toast({
        title: "Success",
        description: "Category added successfully",
      });
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to let the dialog handle the error
    }
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

  const MonthlySummarySkeleton = () => (
    <Card className="mb-8 border-none shadow-md overflow-hidden">
      <CardContent className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const SearchFilterSkeleton = () => (
    <Card className="mb-8 border-none shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TableSkeleton = () => (
    <Card className="border-none shadow-md">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Mobile View Skeleton */}
          <div className="block md:hidden space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow">
                <div className="grid grid-cols-2 gap-2 p-4 border-b">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="divide-y divide-gray-100">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View Skeleton */}
          <div className="hidden md:block">
            <Skeleton className="h-10 w-full mb-4" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Add this new component for the delete confirmation dialog
  const DeleteConfirmationDialog = () => (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this transaction? This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="focus:ring-2 focus:ring-offset-2">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            className="bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Add this new component for the financial summary
  const FinancialSummary = () => {
    // Calculate transaction totals
    const summary = useMemo(() => {
      return dailyCashTransactions.reduce(
        (acc, transaction) => {
          acc.totalCashIn += parseFloat(transaction.cashIn || 0);
          acc.totalCashOut += parseFloat(transaction.cashOut || 0);
          return acc;
        },
        { totalCashIn: 0, totalCashOut: 0 }
      );
    }, [dailyCashTransactions]);

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="overflow-hidden border-none shadow-md">
          <CardContent className="p-0">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 border-b border-green-100 dark:border-green-800">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                  Total Cash In
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total cash received</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                ৳{summary.totalCashIn.toLocaleString()}
              </p>
              <div className="mt-2">
                <Progress value={100} className="h-2 bg-green-100" />
              </div>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                All transactions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <CardContent className="p-0">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 border-b border-red-100 dark:border-red-800">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Total Cash Out
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total expenses paid</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
                ৳{summary.totalCashOut.toLocaleString()}
              </p>
              <div className="mt-2">
                <Progress value={100} className="h-2 bg-red-100" />
              </div>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                All transactions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <CardContent className="p-0">
            <div
              className={`${
                financials.availableCash >= 0
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"
                  : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"
              } p-4 border-b`}
            >
              <div className="flex justify-between items-center">
                <h3
                  className={`text-sm font-medium ${
                    financials.availableCash >= 0
                      ? "text-blue-800 dark:text-blue-300"
                      : "text-amber-800 dark:text-amber-300"
                  }`}
                >
                  Available Balance
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <RefreshCw
                        className={`h-4 w-4 ${
                          financials.availableCash >= 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Current available balance</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="p-4">
              <p
                className={`text-2xl md:text-3xl font-bold ${
                  financials.availableCash >= 0
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                ৳{financials.availableCash.toLocaleString()}
              </p>
              <div className="mt-2">
                <Progress
                  value={Math.abs(
                    (financials.availableCash / summary.totalCashIn) * 100
                  )}
                  className={`h-2 ${
                    financials.availableCash >= 0
                      ? "bg-blue-100"
                      : "bg-amber-100"
                  }`}
                />
              </div>
              <p
                className={`text-xs ${
                  financials.availableCash >= 0
                    ? "text-blue-600/70 dark:text-blue-400/70"
                    : "text-amber-600/70 dark:text-amber-400/70"
                } mt-1`}
              >
                Current balance
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

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

        {/* Monthly Summary */}
        <MonthlySummarySkeleton />

        {/* Search and Filter */}
        <SearchFilterSkeleton />

        {/* Transactions Table */}
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only">
        {loadingState.actions && "Processing your request..."}
        {isPrinting && "Preparing to print..."}
      </div>
      <div aria-live="assertive" className="sr-only">
        {loadingState.error && "An error occurred. Please try again."}
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            role="heading"
            aria-level="1"
          >
            Cash Book
          </h1>
          <p className="text-muted-foreground mt-1" role="contentinfo">
            Manage and track all cash transactions
          </p>
        </div>
        <div
          className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto"
          role="toolbar"
          aria-label="Actions"
        >
          <CashTransactionDialog
            onTransactionSubmit={handleAddTransaction}
            expenseCategories={expenseCategories}
            onAddCategory={handleAddCategory}
            open={isAddingTransaction}
            onOpenChange={setIsAddingTransaction}
          >
            <Button
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white focus:ring-2 focus:ring-offset-2"
              disabled={loadingState.actions}
              aria-label="Add new transaction"
              role="button"
              onClick={() => setIsAddingTransaction(true)}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Transaction
            </Button>
          </CashTransactionDialog>
          <Button
            onClick={handlePrint}
            className="w-full md:w-auto focus:ring-2 focus:ring-offset-2"
            variant="outline"
            disabled={loadingState.actions || isPrinting}
            aria-label={isPrinting ? "Printing report..." : "Print report"}
            role="button"
            aria-busy={isPrinting}
          >
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
            {isPrinting ? "Printing..." : "Print Report"}
          </Button>
          <Button
            onClick={handleExportPDF}
            className="w-full md:w-auto focus:ring-2 focus:ring-offset-2"
            variant="outline"
            disabled={loadingState.actions}
            aria-label="Export as PDF"
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            Export PDF
          </Button>
          <Button
            onClick={handleExportCSV}
            className="w-full md:w-auto focus:ring-2 focus:ring-offset-2"
            variant="outline"
            disabled={loadingState.actions}
            aria-label="Export as CSV"
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <FinancialSummary />

      {/* Monthly Summary */}
      <Card className="mb-8 border-none shadow-md overflow-hidden">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Summary</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Cash In</TableHead>
                  <TableHead className="text-right">Cash Out</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyTotals.map(({ month, cashIn, cashOut, balance }) => (
                  <TableRow key={month}>
                    <TableCell className="font-medium">
                      {new Date(month).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ৳{cashIn.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ৳{cashOut.toLocaleString()}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        balance >= 0 ? "text-blue-600" : "text-amber-600"
                      }`}
                    >
                      ৳{balance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter Section */}
      <Card
        className="mb-8 border-none shadow-md"
        role="search"
        aria-label="Filter transactions"
      >
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
                aria-label="Search transactions"
                role="searchbox"
                aria-controls="transactions-table"
                aria-expanded="false"
              />
            </div>
            <div
              className="flex flex-col md:flex-row gap-2 md:gap-4"
              role="group"
              aria-label="Date filters"
            >
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-9 w-full md:w-[200px] focus:ring-2 focus:ring-offset-2"
                  aria-label="Filter by date"
                  id="date-filter"
                  aria-controls="transactions-table"
                />
              </div>
              {dateFilter && (
                <Button
                  variant="outline"
                  onClick={() => setDateFilter("")}
                  className="w-full md:w-auto focus:ring-2 focus:ring-offset-2"
                  size="icon"
                  aria-label="Clear date filter"
                  role="button"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Clear Date</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode and Filters */}
      <div
        className="mb-6 space-y-4"
        role="group"
        aria-label="View and filter options"
      >
        <Tabs
          value={viewMode}
          onValueChange={setViewMode}
          aria-label="View mode"
          className="focus:outline-none"
        >
          <TabsList className="mb-4" role="tablist" aria-label="View options">
            <TabsTrigger
              value="daily"
              role="tab"
              aria-controls="daily-content"
              aria-selected={viewMode === "daily"}
            >
              Daily View
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              role="tab"
              aria-controls="monthly-content"
              aria-selected={viewMode === "monthly"}
            >
              Monthly View
            </TabsTrigger>
            <TabsTrigger
              value="yearly"
              role="tab"
              aria-controls="yearly-content"
              aria-selected={viewMode === "yearly"}
            >
              Yearly View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div
          className="flex flex-wrap gap-4"
          role="group"
          aria-label="Time period filters"
        >
          <Select
            value={yearFilter}
            onValueChange={setYearFilter}
            name="year-filter"
          >
            <SelectTrigger
              className="w-[180px]"
              aria-label="Filter by year"
              role="combobox"
            >
              <SelectValue
                placeholder="Select Year"
                aria-label="Selected year"
              />
            </SelectTrigger>
            <SelectContent role="listbox" aria-label="Available years">
              {(() => {
                const years = [
                  ...new Set(
                    dailyCashTransactions.map((t) =>
                      new Date(t.date).getFullYear()
                    )
                  ),
                ].sort((a, b) => b - a);
                return years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ));
              })()}
            </SelectContent>
          </Select>
          {viewMode === "monthly" && (
            <Select
              value={monthFilter}
              onValueChange={setMonthFilter}
              aria-label="Filter by month"
            >
              <SelectTrigger className="w-[180px]" role="combobox">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent role="listbox" aria-label="Available months">
                <SelectItem value="01">January</SelectItem>
                <SelectItem value="02">February</SelectItem>
                <SelectItem value="03">March</SelectItem>
                <SelectItem value="04">April</SelectItem>
                <SelectItem value="05">May</SelectItem>
                <SelectItem value="06">June</SelectItem>
                <SelectItem value="07">July</SelectItem>
                <SelectItem value="08">August</SelectItem>
                <SelectItem value="09">September</SelectItem>
                <SelectItem value="10">October</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">December</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            aria-label="Filter by category"
          >
            <SelectTrigger className="w-[180px]" role="combobox">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent role="listbox" aria-label="Available categories">
              <SelectItem value="all">All Categories</SelectItem>
              {expenseCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="in">Cash In</TabsTrigger>
          <TabsTrigger value="out">Cash Out</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Transactions Table */}
      <Card className="border-none shadow-md">
        <CardContent className="p-6">
          {loadingState.transactions ? (
            <TableSkeleton />
          ) : (
            <div className="space-y-4">
              {/* Mobile View */}
              <div className="block md:hidden">
                {filteredCash.map((day) => (
                  <div
                    key={day.date}
                    className="bg-white rounded-lg shadow mb-4"
                    role="article"
                    aria-label={`Transactions for ${formatDate(day.date)}`}
                  >
                    {/* Summary Card */}
                    <div
                      className="grid grid-cols-2 gap-2 p-4 border-b"
                      role="region"
                      aria-label="Daily summary"
                    >
                      <div>
                        <div
                          className="text-sm text-gray-500"
                          aria-hidden="true"
                        >
                          Date
                        </div>
                        <div className="font-medium" role="text">
                          {formatDate(day.date)}
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-sm text-gray-500"
                          aria-hidden="true"
                        >
                          Balance
                        </div>
                        <div className="font-medium" role="text">
                          ৳{day.balance.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-sm text-gray-500"
                          aria-hidden="true"
                        >
                          Cash In
                        </div>
                        <div
                          className="text-green-600"
                          role="text"
                          aria-label={`Cash in amount ${day.cashIn.toLocaleString()}`}
                        >
                          ৳{day.cashIn.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-sm text-gray-500"
                          aria-hidden="true"
                        >
                          Cash Out
                        </div>
                        <div
                          className="text-red-600"
                          role="text"
                          aria-label={`Cash out amount ${day.cashOut.toLocaleString()}`}
                        >
                          ৳{day.cashOut.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Mobile View - Transactions List */}
                    <div
                      className="divide-y divide-gray-100"
                      role="list"
                      aria-label="Transaction details"
                    >
                      {day.dailyCash
                        .filter((t) => t.cashIn > 0)
                        .map((t) => (
                          <div
                            key={`in-${t.id}`}
                            className="flex flex-col gap-2 py-2 px-4"
                            role="listitem"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-medium">
                                {t.description}
                              </span>
                              <div className="flex gap-2 text-sm">
                                <span className="text-green-600">
                                  ৳+{t.cashIn.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    data-radix-dropdown-menu-trigger
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.stopPropagation();
                                      requestAnimationFrame(() =>
                                        setEditingTransaction(t)
                                      );
                                    }}
                                  >
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-500"
                                    onSelect={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTransaction(t.id);
                                    }}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}

                      {day.dailyCash
                        .filter((t) => t.cashOut > 0)
                        .map((t) => (
                          <div
                            key={`out-${t.id}`}
                            className="flex flex-col gap-2 py-2 px-4"
                            role="listitem"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-medium">
                                {t.description}
                              </span>
                              <div className="flex gap-2 text-sm">
                                <span className="text-red-600">
                                  ৳-{t.cashOut.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    data-radix-dropdown-menu-trigger
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.stopPropagation();
                                      requestAnimationFrame(() =>
                                        setEditingTransaction(t)
                                      );
                                    }}
                                  >
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-500"
                                    onSelect={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTransaction(t.id);
                                    }}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block">
                <Table
                  role="grid"
                  aria-label="Cash transactions list"
                  tabIndex="0"
                >
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="whitespace-nowrap min-w-[100px]"
                        scope="col"
                        role="columnheader"
                      >
                        Date
                      </TableHead>
                      <TableHead
                        className="text-right whitespace-nowrap min-w-[100px]"
                        scope="col"
                        role="columnheader"
                      >
                        Cash In
                      </TableHead>
                      <TableHead
                        className="text-right whitespace-nowrap min-w-[100px]"
                        scope="col"
                        role="columnheader"
                      >
                        Cash Out
                      </TableHead>
                      <TableHead
                        className="text-right whitespace-nowrap min-w-[100px]"
                        scope="col"
                        role="columnheader"
                      >
                        Balance
                      </TableHead>
                      <TableHead
                        className="whitespace-nowrap min-w-[200px]"
                        scope="col"
                        role="columnheader"
                      >
                        Details
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCash.map((day) => (
                      <TableRow key={day.date} className="border-b">
                        <TableCell className="whitespace-nowrap font-medium">
                          {formatDate(day.date)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-green-600">
                          ৳{day.cashIn.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-red-600">
                          ৳{day.cashOut.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-medium">
                          ৳{day.balance.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {day.dailyCash
                              .filter((t) => t.cashIn > 0)
                              .map((t) => (
                                <div
                                  key={`in-${t.id}`}
                                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                                    >
                                      In
                                    </Badge>
                                    <span className="font-medium">
                                      {t.description}
                                    </span>
                                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                                      ৳{t.cashIn.toLocaleString()}
                                    </span>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                                        data-radix-dropdown-menu-trigger
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.stopPropagation();
                                          requestAnimationFrame(() =>
                                            setEditingTransaction(t)
                                          );
                                        }}
                                      >
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-500"
                                        onSelect={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTransaction(t.id);
                                        }}
                                      >
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              ))}

                            {day.dailyCash
                              .filter((t) => t.cashOut > 0)
                              .map((t) => (
                                <div
                                  key={`out-${t.id}`}
                                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                                    >
                                      Out
                                    </Badge>
                                    <span className="font-medium">
                                      {t.description}
                                    </span>
                                    <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                                      ৳{t.cashOut.toLocaleString()}
                                    </span>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                                        data-radix-dropdown-menu-trigger
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.stopPropagation();
                                          requestAnimationFrame(() =>
                                            setEditingTransaction(t)
                                          );
                                        }}
                                      >
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-500"
                                        onSelect={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTransaction(t.id);
                                        }}
                                      >
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      {editingTransaction && (
        <CashTransactionDialog
          transaction={editingTransaction}
          open={!!editingTransaction}
          onOpenChange={(open) => {
            if (!open) setEditingTransaction(null);
          }}
          onTransactionSubmit={async (updated) => {
            await handleEditTransaction(editingTransaction.id, updated);
            setEditingTransaction(null);
          }}
          expenseCategories={expenseCategories}
          onAddCategory={handleAddCategory}
          aria-label="Edit transaction"
          role="dialog"
          aria-modal="true"
        />
      )}

      {/* Add the Delete Confirmation Dialog */}
      <DeleteConfirmationDialog />

      {/* Add the printable content div */}
      <div id="printable-content" className="hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Cash In</TableHead>
              <TableHead className="text-right">Cash Out</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCash.map((day) => (
              <TableRow key={day.date}>
                <TableCell>{formatDate(day.date)}</TableCell>
                <TableCell>
                  {day.dailyCash.map((t) => t.description).join(", ")}
                </TableCell>
                <TableCell className="text-right">
                  ৳{day.cashIn.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ৳{day.cashOut.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ৳{day.balance.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

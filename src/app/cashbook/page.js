"use client";
import { useState, useEffect, useMemo } from "react";
import logger from "@/utils/logger";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { AddCashTransactionDialog } from "../../components/AddCashTransactionDialog.jsx";
import { EditCashTransactionDialog } from "../../components/EditCashTransactionDialog.jsx";
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
  Filter,
  RefreshCw,
  Download,
  FileText,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToPDF, exportCashbookToPDF } from "@/utils/export";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorBoundary } from "@/components/ErrorBoundary.jsx";
import { Pagination } from "@/components/Pagination";

export default function CashBookPage() {
  const {
    dailyCashIncome,
    dailyCashExpense,
    addDailyCashTransaction,
    updateDailyCashTransaction,
    deleteDailyCashTransaction,
  } = useData();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // State for PDF export date range
  const [pdfStartDate, setPdfStartDate] = useState(date);
  const [pdfEndDate, setPdfEndDate] = useState(date);

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loadingState, setLoadingState] = useState({
    initial: true,
    transactions: false,
    actions: false,
  });
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openingBalance, setOpeningBalance] = useState(0);

  const dailyCashTransactions = useMemo(
    () => [...(dailyCashIncome || []), ...(dailyCashExpense || [])],
    [dailyCashIncome, dailyCashExpense]
  );

  // Add useEffect to handle initial loading state
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Wait for dailyCashTransactions to be available
        if (dailyCashIncome !== undefined && dailyCashExpense !== undefined) {
          setLoadingState((prev) => ({ ...prev, initial: false }));
        }
      } catch (error) {
        logger.error("Error loading initial data:", error);
        toast({
          title: "Error",
          description: "Failed to load data. Please refresh the page.",
          variant: "destructive",
        });
        setLoadingState((prev) => ({ ...prev, initial: false }));
      }
    };

    initializeData();
  }, [dailyCashIncome, dailyCashExpense, toast]);

  // Add useEffect to handle initial loading state
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Wait for dailyCashTransactions to be available
        if (dailyCashIncome !== undefined && dailyCashExpense !== undefined) {
          setLoadingState((prev) => ({ ...prev, initial: false }));
        }
      } catch (error) {
        logger.error("Error loading initial data:", error);
        toast({
          title: "Error",
          description: "Failed to load data. Please refresh the page.",
          variant: "destructive",
        });
        setLoadingState((prev) => ({ ...prev, initial: false }));
      }
    };

    initializeData();
  }, [dailyCashIncome, dailyCashExpense, toast]);
  useEffect(() => {
    if (date && dailyCashTransactions) {
      const previousDay = new Date(date);
      previousDay.setDate(previousDay.getDate() - 1);
      const previousDayISO = previousDay.toISOString().split("T")[0];

      const balance = dailyCashTransactions
        .filter((t) => t.date <= previousDayISO)
        .reduce((acc, t) => acc + (t.cashIn || 0) - (t.cashOut || 0), 0);
      setOpeningBalance(balance);
    }
  }, [date, dailyCashTransactions, openingBalance]);

  // Remove debug logging in production
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      logger.info("Loading state:", loadingState);
      logger.info(
        "Daily cash transactions count:",
        dailyCashTransactions?.length || 0
      );
      logger.info("dailyCashIncome:", dailyCashIncome);
      logger.info("dailyCashExpense:", dailyCashExpense);
      logger.info("dailyCashTransactions:", dailyCashTransactions);
    }
  }, [loadingState, dailyCashTransactions, dailyCashIncome, dailyCashExpense]);

  // Memoize calculations for better performance with defensive programming
  const { dailyCash, financials, monthlyTotals } = useMemo(() => {
    if (
      !Array.isArray(dailyCashTransactions) ||
      dailyCashTransactions.length === 0
    ) {
      return {
        dailyCash: [],
        financials: { totalCashIn: 0, totalCashOut: 0, availableCash: 0 },
        monthlyTotals: [],
      };
    }

    const dailySummary = dailyCashTransactions.reduce((acc, item) => {
      if (!item?.date) return acc;

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

      const cashIn = Number(item.cashIn) || 0;
      const cashOut = Number(item.cashOut) || 0;

      acc[date].cashIn += cashIn;
      acc[date].cashOut += cashOut;
      acc[date].balance = acc[date].cashIn - acc[date].cashOut;
      acc[date].dailyCash.push(item);

      return acc;
    }, {});

    const dailyCash = Object.values(dailySummary).sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );

    const financials = {
      totalCashIn: dailyCashTransactions.reduce(
        (sum, t) => sum + (Number(t.cashIn) || 0),
        0
      ),
      totalCashOut: dailyCashTransactions.reduce(
        (sum, t) => sum + (Number(t.cashOut) || 0),
        0
      ),
      availableCash: dailyCashTransactions.reduce(
        (sum, t) => sum + ((Number(t.cashIn) || 0) - (Number(t.cashOut) || 0)),
        0
      ),
    };

    const monthly = dailyCashTransactions.reduce((acc, transaction) => {
      if (!transaction?.date) return acc;

      const month = transaction.date.substring(0, 7);
      if (!acc[month]) {
        acc[month] = { cashIn: 0, cashOut: 0 };
      }
      acc[month].cashIn += Number(transaction.cashIn) || 0;
      acc[month].cashOut += Number(transaction.cashOut) || 0;
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

  const { groupedEntries, sortedDates } = useMemo(() => {
    if (!Array.isArray(dailyCashTransactions)) {
      return { groupedEntries: {}, sortedDates: [] };
    }

    let filteredTransactions = dailyCashTransactions;

    if (date) {
      filteredTransactions = filteredTransactions.filter(
        (transaction) => transaction.date === date
      );
    }

    if (searchTerm) {
      filteredTransactions = filteredTransactions.filter((transaction) =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const grouped = filteredTransactions.reduce((acc, entry) => {
      const entryDate = entry.date;
      if (!acc[entryDate]) {
        acc[entryDate] = { income: [], expense: [] };
      }
      if (entry.cashIn > 0) {
        acc[entryDate].income.push({ ...entry, amount: entry.cashIn });
      }
      if (entry.cashOut > 0) {
        acc[entryDate].expense.push({ ...entry, amount: entry.cashOut });
      }
      return acc;
    }, {});

    const sorted = Object.keys(grouped).sort(
      (a, b) => new Date(b) - new Date(a)
    );

    let runningBalance = openingBalance;
    sorted.forEach((date) => {
      const { income, expense } = grouped[date];
      [...income, ...expense]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .forEach((entry) => {
          runningBalance += (entry.cashIn || 0) - (entry.cashOut || 0);
          entry.balance = runningBalance;
        });
    });

    return { groupedEntries: grouped, sortedDates: sorted };
  }, [dailyCashTransactions, date, searchTerm, openingBalance]);

  const handleEditClick = (entry) => {
    setEditingTransaction(entry);
  };

  const handleDeleteClick = (id) => {
    handleDeleteTransaction(id);
  };

  const handleAddTransaction = async (transaction) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await addDailyCashTransaction(transaction);

      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
    } catch (error) {
      logger.error("Error adding transaction:", error);
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
    setLoadingState((prev) => ({ ...prev, actions: true }));

    try {
      await updateDailyCashTransaction(transactionId, updatedData);
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
    } catch (error) {
      logger.error("Error updating transaction:", error);
      toast({
        title: "Error",
        description: "Failed to update transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      // Pass reference if it exists
      await deleteDailyCashTransaction(transactionId);
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleClearFilter = () => {
    setDate(null);
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
    const start = new Date(pdfStartDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(pdfEndDate);
    end.setUTCHours(0, 0, 0, 0);

    const filteredDailyCash = dailyCash.filter((day) => {
      const dayDate = new Date(day.date);
      dayDate.setUTCHours(0, 0, 0, 0);
      return dayDate >= start && dayDate <= end;
    });

    const transactionsForPDF = filteredDailyCash.flatMap(
      (day) => day.dailyCash
    );

    const financialsForPDF = {
      totalCashIn: filteredDailyCash.reduce((sum, day) => sum + day.cashIn, 0),
      totalCashOut: filteredDailyCash.reduce(
        (sum, day) => sum + day.cashOut,
        0
      ),
      availableCash: filteredDailyCash.reduce(
        (sum, day) => sum + day.balance,
        0
      ),
    };

    const data = {
      title: "Cash Book Report",
      date: new Date().toLocaleDateString(),
      transactions: transactionsForPDF,
      summary: financialsForPDF,
      dailyCash: filteredDailyCash,
      startDate: pdfStartDate,
      endDate: pdfEndDate,
    };
    exportCashbookToPDF(data);
  };

  // Loading skeleton components (static placeholders — must not reference runtime variables)
  const SummaryCardSkeleton = () => (
    <Card className="overflow-hidden border-none shadow-md">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 md:border-r">
            <h4 className="font-medium mb-2 text-green-600">INCOME</h4>
            <div className="space-y-2 min-h-[50px]">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="border-t mt-2 pt-2 flex justify-between font-bold text-green-600">
              <span>Daily Total</span>
              <span>
                <Skeleton className="h-5 w-20" />
              </span>
            </div>
          </div>

          <div className="p-4">
            <h4 className="font-medium mb-2 text-destructive">EXPENSE</h4>
            <div className="space-y-2 min-h-[50px]">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="border-t mt-2 pt-2 flex justify-between font-bold text-destructive">
              <span>Daily Total</span>
              <span>
                <Skeleton className="h-5 w-20" />
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const SearchFilterSkeleton = () => (
    <Card className="mb-8 border-none shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-40" />
        </div>
      </CardContent>
    </Card>
  );

  const TableSkeleton = () => (
    <Card className="border-none shadow-md">
      <CardContent className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/6" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ErrorBoundary>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cash Book</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all cash transactions
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
            <AddCashTransactionDialog onAddTransaction={handleAddTransaction}>
              <Button
                className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white"
                disabled={loadingState.actions}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </AddCashTransactionDialog>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  className="w-full md:w-auto"
                  variant="outline"
                  disabled={loadingState.actions}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {pdfStartDate && pdfEndDate
                    ? `Export PDF (${formatDate(pdfStartDate)} - ${formatDate(
                        pdfEndDate
                      )})`
                    : "Export PDF"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4">
                <div className="space-y-4">
                  <h4 className="font-medium leading-none">Export PDF</h4>
                  <p className="text-sm text-muted-foreground">
                    Select a date range for the PDF report.
                  </p>
                  <div className="grid gap-2">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <label htmlFor="pdf-start-date">Start Date</label>
                      <Input
                        id="pdf-start-date"
                        type="date"
                        value={pdfStartDate}
                        onChange={(e) => setPdfStartDate(e.target.value)}
                        className="col-span-2 h-8"
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <label htmlFor="pdf-end-date">End Date</label>
                      <Input
                        id="pdf-end-date"
                        type="date"
                        value={pdfEndDate}
                        onChange={(e) => setPdfEndDate(e.target.value)}
                        className="col-span-2 h-8"
                      />
                    </div>
                  </div>
                  <Button onClick={handleExportPDF} className="w-full">
                    Export
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
              <div className="bg-green-50 dark:bg-green-900/20 p-4 border-b border-green-100 dark:border-green-800">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                    Total Cash In
                  </h3>
                  <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="p-4">
                <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                  ৳{financials.totalCashIn}
                </p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                  All time income
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
                  <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="p-4">
                <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
                  ৳{financials.totalCashOut}
                </p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                  All time expenses
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
                  <RefreshCw
                    className={`h-4 w-4 ${
                      financials.availableCash >= 0
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  />
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
                  ৳{financials.availableCash}
                </p>
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
                        {cashIn}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {cashOut}
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
        <Card className="mb-8 border-none shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={date || ""}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              <Button variant="ghost" onClick={handleClearFilter}>
                <X className="mr-2 h-4 w-4" />
                Clear Filter
              </Button>
            </div>
          </CardContent>
        </Card>

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
          <CardContent>
            <div className="space-y-4">
              {sortedDates.length > 0 ? (
                sortedDates.map((date) => {
                  let { income, expense } = groupedEntries[date];

                  if (activeTab === "in") {
                    expense = [];
                  } else if (activeTab === "out") {
                    income = [];
                  }

                  if (income.length === 0 && expense.length === 0) return null;

                  const dailyIncomeTotal = income.reduce(
                    (sum, i) => sum + i.amount,
                    0
                  );
                  const dailyExpenseTotal = expense.reduce(
                    (sum, e) => sum + e.amount,
                    0
                  );

                  return (
                    <div
                      key={date}
                      className="border rounded-lg overflow-hidden shadow-sm"
                    >
                      <div className="bg-muted/50 px-4 py-2 border-b">
                        <h3 className="font-semibold text-lg">
                          {new Date(date + "T00:00:00").toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        {income.length > 0 && (
                          <div className="p-4 md:border-r">
                            <h4 className="font-medium mb-2 text-green-600">
                              INCOME
                            </h4>
                            <div className="space-y-2 min-h-[50px]">
                              {income.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex justify-between items-center text-sm group"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {entry.description}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {entry.category}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">
                                      ৳{entry.amount.toFixed(2)}
                                    </span>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleEditClick(entry)}
                                      >
                                        <PencilIcon className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive"
                                        onClick={(e) =>
                                          handleDeleteClick(entry.id)
                                        }
                                      >
                                        <TrashIcon className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="border-t mt-2 pt-2 flex justify-between font-bold text-green-600">
                              <span>Daily Total</span>
                              <span>৳{dailyIncomeTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                        {expense.length > 0 && (
                          <div className="p-4">
                            <h4 className="font-medium mb-2 text-destructive">
                              EXPENSE
                            </h4>
                            <div className="space-y-2 min-h-[50px]">
                              {expense.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex justify-between items-center text-sm group"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {entry.description}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {entry.category}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">
                                      ৳{entry.amount.toFixed(2)}
                                    </span>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleEditClick(entry)}
                                      >
                                        <PencilIcon className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive"
                                        onClick={(e) =>
                                          handleDeleteClick(entry.id)
                                        }
                                      >
                                        <TrashIcon className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="border-t mt-2 pt-2 flex justify-between font-bold text-destructive">
                              <span>Daily Total</span>
                              <span>৳{dailyExpenseTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="bg-muted/50 px-4 py-3 border-t font-bold flex justify-between">
                        <span>Daily Balance</span>
                        <span>
                          ৳{(dailyIncomeTotal - dailyExpenseTotal).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  No entries found matching your filters.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Transaction Dialog */}
        {editingTransaction && (
          <EditCashTransactionDialog
            transaction={editingTransaction}
            open={!!editingTransaction}
            onOpenChange={(open) => {
              if (!open) setEditingTransaction(null);
            }}
            onEditTransaction={(updated) => {
              handleEditTransaction(editingTransaction.id, updated);
              setEditingTransaction(null);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import logger from "@/utils/logger";
import { useTransactions } from "@/contexts/transaction-context";
import { useSettings } from "@/contexts/settings-context";
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
import { AddCashTransactionDialog } from "@/components/transactions/AddCashTransactionDialog";
import { EditCashTransactionDialog } from "@/components/transactions/EditCashTransactionDialog";
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
  ArrowRightLeft,
  X,
  Filter,
  RefreshCw,
  Download,
  FileText,
  PencilIcon,
  TrashIcon,
  DollarSign,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary.jsx";
import { Pagination } from "@/components/shared/Pagination";

export default function CashBookPage() {
  const {
    transactions, // Added
    dailyCashIncome,
    dailyCashExpense,
    addDailyCashTransaction,
    addAccountTransaction, // Added
    updateDailyCashTransaction,
    updateAccountTransaction, 
    deleteDailyCashTransaction,
    deleteAccountTransaction, // Added
  } = useTransactions();
  const { storeBalance } = useSettings(); // Added
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

  const dailyCashTransactions = useMemo(() => {
    // 1. Process Legacy Data (DailyCashIncome/Expense)
    const legacy = [...(dailyCashIncome || []), ...(dailyCashExpense || [])].map((t) => ({
      ...t,
      id: t.id,
      type: t.cashIn > 0 ? "income" : "expense",
      paymentMode: "cash",
      amount: Number(t.cashIn || t.cashOut),
      date: t.date,
      description: t.description,
      category: t.category,
      isLegacy: true,
    }));

    // 2. Process New Account Transactions
    const modern = (transactions || []).filter(
      (t) => {
        // Must be unlinked from customer transactions (pure cashbook)
        if (t.customerId) return false;
        
        // Exclude Bank-Only transactions (Income/Expense paid via Bank) as they do not affect "Cash in Hand"
        // Transfer ALWAYS affects cash (either in or out)
        if (t.type === 'transfer') return true;
        
        // Income/Expense: Only include if Payment Mode is 'cash' (or legacy/undefined which defaults to cash)
        if (['income', 'expense'].includes(t.type)) {
            return !t.paymentMode || t.paymentMode === 'cash';
        }
        
        return false;
      }
    );

    // 3. Combine and Sort
    const combined = [...legacy, ...modern];
    combined.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    
    return combined;
  }, [dailyCashIncome, dailyCashExpense, transactions]);

  // Calculate Balances Client-Side (aggregating legacy + modern)
  const calculatedBalance = useMemo(() => {
    let cash = 0;
    let bank = 0;
    let opening = 0;

    // 1. Legacy Data
    if (dailyCashIncome) {
      dailyCashIncome.forEach((t) => (cash += Number(t.cashIn) || 0));
    }
    if (dailyCashExpense) {
      dailyCashExpense.forEach((t) => (cash -= Number(t.cashOut) || 0));
    }

    // 2. Modern Data (excluding customer transactions for now if we strictly want cashbook)
    // The previous filter was: !t.customerId && ["income", "expense", "transfer"].includes(t.type)
    const modern = (transactions || []).filter(
      (t) => !t.customerId && ["income", "expense", "transfer"].includes(t.type)
    );

    modern.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income") {
        if (t.paymentMode === "bank") bank += amt;
        else cash += amt; // Default to cash
      } else if (t.type === "expense") {
        if (t.paymentMode === "bank") bank -= amt;
        else cash -= amt;
      } else if (t.type === "transfer") {
        if (t.transferType === "deposit") {
          // Cash -> Bank
          cash -= amt;
          bank += amt;
        } else if (t.transferType === "withdraw") {
          // Bank -> Cash
          bank -= amt;
          cash += amt;
        }
      }
    });

    return { cash, bank };
  }, [dailyCashIncome, dailyCashExpense, transactions]);

  useEffect(() => {
    const initializeData = async () => {
      try {
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
  }, [date, dailyCashTransactions]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      logger.info("Loading state:", loadingState);
      logger.info(
        "Daily cash transactions count:",
        dailyCashTransactions?.length || 0
      );
    }
  }, [loadingState, dailyCashTransactions]);

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

      const cashIn = Number(item.amount) || Number(item.cashIn) || 0;
      // For transfers, we need to be careful.
      // If it's a transfer, we don't double count inflow/outflow for the *Totals* unless we want to see volume.
      // But for "Cash" daily summary, we usually want to see cash flow.
      
      // Let's normalize for the daily summary:
      let flowIn = 0;
      let flowOut = 0;

      if (item.isLegacy) {
        flowIn = Number(item.cashIn) || 0;
        flowOut = Number(item.cashOut) || 0;
      } else {
        const amt = Number(item.amount) || 0;
        // Logic for "Cash" book summary vs "Bank"
        // If we want a combined view:
        if (item.type === 'income') flowIn = amt;
        else if (item.type === 'expense') flowOut = amt;
        else if (item.type === 'transfer') {
             // For summary, maybe just ignore or show net?
             // If we list it in both cols, we might want to sum it.
             // But financials should probably reflect Net Asset Change? 
             // Income increases assets, Expense decreases. Transfer is neutral.
             // So for 'financials' (Net Profit context), transfers are 0.
             // But for 'Cash Flow' they are real.
             // Current Implementation of `financials` sums `cashIn`.
             // We'll treat flow as:
             if (item.paymentMode === 'cash' || !item.paymentMode) {
                // If it's a cash impact
             }
             // To keep it simple for the charts/monthly summary which are "Cash In" / "Cash Out":
             flowIn = (item.type === 'income') ? amt : 0;
             flowOut = (item.type === 'expense') ? amt : 0;
        }
      }

      acc[date].cashIn += flowIn;
      acc[date].cashOut += flowOut;
      acc[date].balance = acc[date].cashIn - acc[date].cashOut;
      acc[date].dailyCash.push(item);

      return acc;
    }, {});

    const dailyCash = Object.values(dailySummary).sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );

    // Recalculate based on normalized flows if needed, but the 'calculatedBalance' above is better for Headings.
    // We will keep 'financials' for legacy support or PDF but prefer calculatedBalance.
    const financials = {
      totalCashIn: dailyCashTransactions.reduce((sum, t) => {
         if (t.isLegacy && t.cashIn > 0) return sum + (Number(t.cashIn)||0);
         if (t.type === 'income') return sum + (Number(t.amount)||0);
         if (t.type === 'transfer' && t.transferType === 'withdraw') return sum + (Number(t.amount)||0);
         return sum;
      }, 0),
      totalCashOut: dailyCashTransactions.reduce((sum, t) => {
         if (t.isLegacy && t.cashOut > 0) return sum + (Number(t.cashOut)||0);
         if (t.type === 'expense') return sum + (Number(t.amount)||0);
         if (t.type === 'transfer' && t.transferType === 'deposit') return sum + (Number(t.amount)||0);
         return sum;
      }, 0),
      availableCash: calculatedBalance.cash // Use the accurate one
    };

    const monthly = dailyCashTransactions.reduce((acc, transaction) => {
      if (!transaction?.date) return acc;

      const month = transaction.date.substring(0, 7);
      if (!acc[month]) {
        acc[month] = { cashIn: 0, cashOut: 0 };
        // We can track bank separately if needed, but this is "Cash Book" monthly summary
      }
      
      let amtIn = 0;
      let amtOut = 0;
      const amount = Number(transaction.amount) || 0;
      
      if (transaction.isLegacy) {
         amtIn = Number(transaction.cashIn) || 0;
         amtOut = Number(transaction.cashOut) || 0;
      } else {
         if (transaction.type === 'income') amtIn = amount;
         else if (transaction.type === 'expense') amtOut = amount;
         else if (transaction.type === 'transfer') {
             if (transaction.transferType === 'deposit') amtOut = amount; // Cash Out
             else if (transaction.transferType === 'withdraw') amtIn = amount; // Cash In
         }
      }

      acc[month].cashIn += amtIn;
      acc[month].cashOut += amtOut;
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

  const filteredTransactions = useMemo(() => {
    let result = dailyCashTransactions;

    if (date) {
      result = result.filter((t) => t.date === date);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          (t.description || "").toLowerCase().includes(lower) ||
          (t.category || "").toLowerCase().includes(lower)
      );
    }

    if (activeTab !== "all") {
      result = result.filter((t) => t.type === activeTab);
    }

    return result;
  }, [dailyCashTransactions, date, searchTerm, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [date, searchTerm, activeTab]);

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
      
      const amount = Number(entry.amount) || 0;

      if (entry.type === 'income') {
        acc[entryDate].income.push({ ...entry, amount });
      } else if (entry.type === 'expense') {
        acc[entryDate].expense.push({ ...entry, amount });
      } else if (entry.type === 'transfer') {
        // Correctly classify Transfer based on Cash Flow
        if (entry.transferType === 'deposit') {
            // Cash -> Bank (Cash Outflow / Expense)
            acc[entryDate].expense.push({ ...entry, amount, isTransferOut: true });
        } else if (entry.transferType === 'withdraw') {
            // Bank -> Cash (Cash Inflow / Income)
            acc[entryDate].income.push({ ...entry, amount, isTransferIn: true });
        } else {
            // Fallback if type is missing (legacy?), show in both to be safe or ignore?
            // Let's assume it's neutral if undefined, but ideally we fix data.
            // For now, to allow editing, we might need it somewhere.
            // But strict cashbook flow implies one direction.
        }
      } else if (entry.isLegacy) {
          // Fallback for legacy
         if ((entry.cashIn || 0) > 0) acc[entryDate].income.push({ ...entry, amount: entry.cashIn });
         if ((entry.cashOut || 0) > 0) acc[entryDate].expense.push({ ...entry, amount: entry.cashOut });
      }
      
      return acc;
    }, {});

    const sorted = Object.keys(grouped).sort(
      (a, b) => new Date(b) - new Date(a)
    );

    let runningBalance = openingBalance;
    // Calculate running balance if needed, though with filtered/pagination it's tricky.
    // We'll stick to daily totals for the cards.
    return { groupedEntries: grouped, sortedDates: sorted };
  }, [filteredTransactions, openingBalance]);

  const handleDeleteTransaction = useCallback(
    async (transaction) => {
      setLoadingState((prev) => ({ ...prev, actions: true }));
      try {
        // Check if legacy or modern
        if (transaction.isLegacy) {
          await deleteDailyCashTransaction(transaction.id);
        } else {
          await deleteAccountTransaction(transaction.id);
        }

        toast({
          title: "Success",
          description: "Transaction deleted successfully",
        });
      } catch (error) {
        console.error("Delete error details:", error);
        logger.error("Error deleting transaction:", error);
        toast({
          title: "Error",
          description: error?.message || "Failed to delete transaction. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingState((prev) => ({ ...prev, actions: false }));
      }
    },
    [deleteDailyCashTransaction, toast]
  );

  const handleEditClick = useCallback((entry) => {
    setEditingTransaction(entry);
  }, []);

  const handleDeleteClick = useCallback(
    (entry) => {
      handleDeleteTransaction(entry);
    },
    [handleDeleteTransaction]
  );

  const handleAddTransaction = useCallback(
    async (transaction) => {
      setLoadingState((prev) => ({ ...prev, actions: true }));
      try {
        await addAccountTransaction(transaction); // Updated to use addAccountTransaction

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
    },
    [addAccountTransaction, toast]
  );



  // ... (existing code)

  const handleEditTransaction = useCallback(
    async (transactionId, updatedData) => {
      setLoadingState((prev) => ({ ...prev, actions: true }));

      try {
        // Determine if it's a legacy transaction or a new account transaction
        // We can check if the original transaction (which we need reference to, but don't have here easily)
        // OR we can infer from the data structure.
        // Ideally, we should pass the full original transaction object to handleEditTransaction or checking `editingTransaction` state.
        
        const isLegacy = editingTransaction?.isLegacy;

        if (isLegacy) {
            await updateDailyCashTransaction(transactionId, updatedData);
        } else {
            await updateAccountTransaction(transactionId, updatedData);
        }

        toast({
          title: "Success",
          description: "Transaction updated successfully",
        });
        setEditingTransaction(null);
      } catch (error) {
        logger.error("Error updating transaction:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to update transaction. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingState((prev) => ({ ...prev, actions: false }));
      }
    },
    [updateDailyCashTransaction, updateAccountTransaction, editingTransaction, toast]
  );

  const handleClearFilter = useCallback(() => {
    setDate(null);
    setSearchTerm("");
  }, []);

  const handleExportCSV = useCallback(() => {
    const data = dailyCashTransactions.map((t) => ({
      Date: formatDate(t.date),
      Description: t.description,
      "Cash In": t.cashIn || 0,
      "Cash Out": t.cashOut || 0,
      Balance: (t.cashIn || 0) - (t.cashOut || 0),
    }));
    exportToCSV(data, "cashbook-report.csv");
    toast({
      title: "Success",
      description: "CSV exported successfully",
    });
  }, [dailyCashTransactions, toast]);

  const handleExportPDF = useCallback(() => {
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
    toast({
      title: "Success",
      description: "PDF exported successfully",
    });
  }, [pdfStartDate, pdfEndDate, dailyCash, toast]);

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
        {loadingState.initial ? (
          <div className="space-y-8">
            <SummaryCardSkeleton />
            <SearchFilterSkeleton />
            <TableSkeleton />
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Cash Book</h1>
                <p className="text-muted-foreground mt-1">
                  Manage and track all cash transactions
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
                <AddCashTransactionDialog
                  onAddTransaction={handleAddTransaction}
                >
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
                        ? `Export PDF (${formatDate(
                            pdfStartDate
                          )} - ${formatDate(pdfEndDate)})`
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

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(calculatedBalance.cash)}</div>
                  <p className="text-xs text-muted-foreground">Physical Cash on Hand</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(calculatedBalance.bank)}</div>
                  <p className="text-xs text-muted-foreground">Bank Account Funds</p>
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
                      {monthlyTotals.map(
                        ({ month, cashIn, cashOut, balance }) => (
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
                                balance >= 0
                                  ? "text-blue-600"
                                  : "text-amber-600"
                              }`}
                            >
                              ৳{balance.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        )
                      )}
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
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mb-6"
            >
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Transactions</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expense">Expense</TabsTrigger>
                <TabsTrigger value="transfer">Transfer</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Transactions Table */}
            {/* Transactions Card List (Grouped by Date) */}
            <div className="space-y-6">
              {sortedDates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((date) => {
                const { income, expense } = groupedEntries[date];
                
                const dailyIncomeTotal = income.reduce((sum, i) => sum + (Number(i.amount)||0), 0);
                const dailyExpenseTotal = expense.reduce((sum, e) => sum + (Number(e.amount)||0), 0);
                const dailyBalance = dailyIncomeTotal - dailyExpenseTotal;

                return (
                  <Card key={date} className="overflow-hidden border-none shadow-md">
                    <CardHeader className="bg-muted/50 py-3">
                       <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-semibold">
                          {formatDate(date)} <span className="text-sm font-normal text-muted-foreground ml-2">{new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        </CardTitle>
                        <Badge variant="outline" className="text-base">
                          Daily Balance: <span className={dailyBalance >= 0 ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                            {dailyBalance >= 0 ? '+' : ''}{formatCurrency(dailyBalance)}
                          </span>
                        </Badge>
                       </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                        {/* INCOME COLUMN */}
                        <div className="p-4">
                           <div className="flex justify-between items-center mb-3">
                             <h4 className="font-bold text-green-600 flex items-center gap-2">
                               <ArrowUpRight className="h-4 w-4" /> INCOME
                             </h4>
                             <span className="font-bold text-green-600">{formatCurrency(dailyIncomeTotal)}</span>
                           </div>
                           <div className="space-y-3">
                             {income.map(t => (
                               <div key={t.id + '-in'} className="group flex justify-between items-start text-sm p-2 rounded-md hover:bg-muted/50 transition-colors">
                                  <div className="space-y-1">
                                    <div className="font-medium flex items-center gap-2">
                                      {t.description}
                                      {t.type === 'transfer' && (
                                         <Badge variant="outline" className="text-[10px] h-5 px-1 bg-blue-50 text-blue-700 border-blue-200">
                                           Transfer
                                         </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                      <Badge variant="secondary" className="text-[10px] h-5 px-1">{t.category}</Badge>
                                      {t.paymentMode && <span>• {t.paymentMode.toUpperCase()}</span>}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                     <span className="font-bold text-green-700">+{formatCurrency(t.amount)}</span>
                                     <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEditClick(t)}>
                                          <PencilIcon className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteClick(t)}>
                                          <TrashIcon className="h-3 w-3" />
                                        </Button>
                                     </div>
                                  </div>
                               </div>
                             ))}
                             {income.length === 0 && <p className="text-muted-foreground text-center text-sm py-4 italic">No income</p>}
                           </div>
                        </div>

                        {/* EXPENSE COLUMN */}
                        <div className="p-4">
                           <div className="flex justify-between items-center mb-3">
                             <h4 className="font-bold text-red-600 flex items-center gap-2">
                               <ArrowDownRight className="h-4 w-4" /> EXPENSE
                             </h4>
                             <span className="font-bold text-red-600">{formatCurrency(dailyExpenseTotal)}</span>
                           </div>
                           <div className="space-y-3">
                             {expense.map(t => (
                               <div key={t.id + '-out'} className="group flex justify-between items-start text-sm p-2 rounded-md hover:bg-muted/50 transition-colors">
                                  <div className="space-y-1">
                                    <div className="font-medium flex items-center gap-2">
                                      {t.description}
                                      {t.type === 'transfer' && (
                                         <Badge variant="outline" className="text-[10px] h-5 px-1 bg-blue-50 text-blue-700 border-blue-200">
                                           Transfer
                                         </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                      <Badge variant="secondary" className="text-[10px] h-5 px-1">{t.category}</Badge>
                                      {t.paymentMode && <span>• {t.paymentMode.toUpperCase()}</span>}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                     <span className="font-bold text-red-700">-{formatCurrency(t.amount)}</span>
                                     <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEditClick(t)}>
                                          <PencilIcon className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteClick(t)}>
                                          <TrashIcon className="h-3 w-3" />
                                        </Button>
                                     </div>
                                  </div>
                               </div>
                             ))}
                             {expense.length === 0 && <p className="text-muted-foreground text-center text-sm py-4 italic">No expense</p>}
                           </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {sortedDates.length === 0 && (
                 <div className="text-center py-12 text-muted-foreground">
                   No transactions found.
                 </div>
              )}

              {sortedDates.length > itemsPerPage && (
                   <div className="py-4">
                      <Pagination
                        currentPage={currentPage}
                        totalItems={sortedDates.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                      />
                   </div>
              )}
            </div>
          </>
        )}

        {/* Edit Transaction Dialog */}
        {editingTransaction && (
          <EditCashTransactionDialog
            transaction={editingTransaction}
            open={!!editingTransaction}
            onOpenChange={(open) => {
              if (!open) setEditingTransaction(null);
            }}
            onEditTransaction={(id, updated) => {
              handleEditTransaction(id, updated);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

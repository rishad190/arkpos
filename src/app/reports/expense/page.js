"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { useTransactions } from "@/contexts/transaction-context";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Building2, Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  formatCurrency,
  exportToCSV,
  exportToPDF,
  formatDate,
} from "@/lib/utils";
import { useReactToPrint } from "react-to-print";
import ExpenseReportPrint from "@/components/reports/ExpenseReportPrint";

export default function ExpenseReportPage() {
  const { dailyCashTransactions, loading } = useTransactions();
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [viewMode, setViewMode] = useState("monthly"); // monthly, yearly, all-time

  const printRef = useRef();

  // Extract unique categories from transactions (Modern + Legacy)
  const expenseCategories = useMemo(() => {
    const transactions = Array.isArray(dailyCashTransactions) ? dailyCashTransactions : [];
    const categories = new Set();
    
    transactions.forEach((t) => {
      let isExpense = false;
      let category = "";

      if (t.isLegacy) {
         if ((t.cashOut || 0) > 0) {
            isExpense = true;
            category = t.category; // Legacy category
         }
      } else {
         // Modern Schema
         // Expense OR Transfer (Deposit to bank is expense from cash)
         if (t.type === 'expense') isExpense = true;
         else if (t.type === 'transfer' && t.transferType === 'deposit') isExpense = true;
         
         if (isExpense) category = t.category;
      }

      if (isExpense) {
        categories.add(category || "Uncategorized");
      }
    });
    
    return Array.from(categories).sort();
  }, [dailyCashTransactions]);

  const filteredTransactions = useMemo(() => {
    // Ensure dailyCashTransactions is an array
    const transactions = Array.isArray(dailyCashTransactions) ? dailyCashTransactions : [];
    
    console.log("ExpenseReport: All Transactions:", transactions.length, transactions[0]);
    console.log("ExpenseReport: Selected Period:", selectedPeriod, "View Mode:", viewMode);

    if (viewMode === "monthly") {
      const filtered = transactions.filter((t) =>
        (t.date || t.createdAt)?.startsWith(selectedPeriod)
      );
      console.log("ExpenseReport: Monthly Filtered:", filtered.length);
      return filtered;
    }
    if (viewMode === "yearly") {
      const year = selectedPeriod.slice(0, 4);
      const filtered = transactions.filter((t) => (t.date || t.createdAt)?.startsWith(year));
      console.log("ExpenseReport: Yearly Filtered:", filtered.length);
      return filtered;
    }
    return transactions;
  }, [dailyCashTransactions, selectedPeriod, viewMode]);

  const categoryTotals = useMemo(() => {
    const totals = {};

    // Initialize all known categories with 0
    expenseCategories.forEach((category) => {
      totals[category] = 0;
    });

    // Calculate totals from transactions
    filteredTransactions.forEach((t) => {
      let amount = 0;
      let category = "";
      let isExpense = false;

      if (t.isLegacy) {
         amount = Number(t.cashOut) || 0;
         if (amount > 0) {
            isExpense = true;
            category = t.category;
         }
      } else {
         const tAmount = Number(t.amount) || 0;
         if (t.type === 'expense') {
             isExpense = true;
             amount = tAmount;
         } else if (t.type === 'transfer' && t.transferType === 'deposit') {
             isExpense = true;
             amount = tAmount;
         }
         if (isExpense) category = t.category;
      }

      if (isExpense && amount > 0) {
        const catName = category || "Uncategorized";
        totals[catName] = (totals[catName] || 0) + amount;
      }
    });

    return totals;
  }, [filteredTransactions, expenseCategories]);

  const bankTotals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        let deposit = 0;
        let withdrawal = 0;

        if (t.isLegacy) {
           // Legacy didn't have strict bank types in dailyCash, usually separate.
           // Assuming dailyCashTransactions only has cash items mostly, unless we merged bank too.
           // If this list contains everything:
           if (t.paymentMode === 'bank') {
              if (t.cashIn > 0) deposit = Number(t.cashIn);
              if (t.cashOut > 0) withdrawal = Number(t.cashOut);
           }
        } else {
           const amt = Number(t.amount) || 0;
           // Bank Deposit = Income to Bank
           if (t.type === 'income' && t.paymentMode === 'bank') deposit = amt;
           // Cash -> Bank Transfer is a Deposit for Bank
           if (t.type === 'transfer' && t.transferType === 'deposit') deposit = amt;

           // Bank Withdrawal = Expense from Bank
           if (t.type === 'expense' && t.paymentMode === 'bank') withdrawal = amt;
           // Bank -> Cash Transfer is a Withdrawal from Bank
           if (t.type === 'transfer' && t.transferType === 'withdraw') withdrawal = amt;
        }

        acc.deposits += deposit;
        acc.withdrawals += withdrawal;
        return acc;
      },
      { deposits: 0, withdrawals: 0 }
    );
  }, [filteredTransactions]);

  const totalExpenses = useMemo(
    () =>
      Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0),
    [categoryTotals]
  );

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date.toISOString().slice(0, 7);
      }),
    []
  );

  const years = useMemo(() => {
    const transactions = Array.isArray(dailyCashTransactions) ? dailyCashTransactions : [];
    return Array.from(
      new Set(transactions.map((t) => t.date?.slice(0, 4)).filter(Boolean))
    ).sort((a, b) => b - a);
  }, [dailyCashTransactions]);

  const handleExportCSV = () => {
    const data = Object.entries(categoryTotals).map(([category, amount]) => ({
      Category: category,
      Amount: amount,
      Percentage:
        totalExpenses > 0
          ? ((amount / totalExpenses) * 100).toFixed(2) + "%"
          : "0%",
    }));
    exportToCSV(data, "expense-report");
  };

  const handleExportPDF = () => {
    const data = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount: formatCurrency(amount),
      percentage:
        totalExpenses > 0
          ? `${((amount / totalExpenses) * 100).toFixed(1)}%`
          : "0%",
    }));

    exportToPDF(data, "Expense Report", {
      title: "Expense Report",
      subtitle: `For ${
        viewMode === "monthly"
          ? new Date(selectedPeriod).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
            })
          : selectedPeriod
      }`,
      columns: [
        { header: "Category", dataKey: "category" },
        { header: "Amount", dataKey: "amount" },
        { header: "Percentage", dataKey: "percentage" },
      ],
    });
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Expense-Report",
    onPrintError: () => alert("Failed to print. Please try again."),
  });

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Expense Report"
        description="Detailed analysis of your expenses and bank transactions"
        actions={
          <>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
            <Button onClick={handleExportPDF} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </>
        }
      />

      {/* View Mode and Date Selection */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <Tabs
          value={viewMode}
          onValueChange={(value) => {
            setViewMode(value);
            if (value === "monthly") {
              setSelectedPeriod(new Date().toISOString().slice(0, 7));
            } else if (value === "yearly") {
              setSelectedPeriod(new Date().getFullYear().toString());
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
            <TabsTrigger value="all-time">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode !== "all-time" && (
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {viewMode === "monthly"
                ? months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {new Date(month + "-02").toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })}
                    </SelectItem>
                  ))
                : years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <CardDescription>All categories combined</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalExpenses)}
            </div>
            <Progress
              value={100}
              className="h-2 mt-2"
              aria-label="Total Expenses"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bank Deposits</CardTitle>
            <CardDescription>Total bank deposits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Building2 className="h-4 w-4 text-blue-500 mr-2" />
              <div className="text-2xl font-bold text-blue-500">
                {formatCurrency(bankTotals.deposits)}
              </div>
            </div>
            <Progress
              value={100}
              className="h-2 mt-2 bg-blue-100"
              aria-label="Bank Deposits"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Bank Withdrawals
            </CardTitle>
            <CardDescription>Total bank withdrawals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Building2 className="h-4 w-4 text-purple-500 mr-2" />
              <div className="text-2xl font-bold text-purple-500">
                {formatCurrency(bankTotals.withdrawals)}
              </div>
            </div>
            <Progress
              value={100}
              className="h-2 mt-2 bg-purple-100"
              aria-label="Bank Withdrawals"
            />
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
          <CardDescription>Breakdown by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.keys(categoryTotals).length > 0 ? (
              Object.entries(categoryTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatCurrency(amount)}
                        </span>
                        <Badge variant="outline">
                          {totalExpenses > 0
                            ? `${((amount / totalExpenses) * 100).toFixed(1)}%`
                            : "0%"}
                        </Badge>
                      </div>
                    </div>
                    <Progress
                      value={
                        totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                      }
                      className="h-2"
                      aria-label={`${category} expense percentage`}
                    />
                  </div>
                ))
            ) : (
              <p className="text-sm text-gray-500">
                No expense categories found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bank Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Transactions</CardTitle>
          <CardDescription>
            Recent bank activity for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.filter(
                (t) =>
                  t.transactionType === "bank_deposit" ||
                  t.transactionType === "bank_withdrawal"
              ).length > 0 ? (
                filteredTransactions
                  .filter(
                    (t) =>
                      t.transactionType === "bank_deposit" ||
                      t.transactionType === "bank_withdrawal"
                  )
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 10)
                  .map((transaction) => {
                    const isDeposit =
                      transaction.transactionType === "bank_deposit";
                    const amount = isDeposit
                      ? transaction.cashIn
                      : transaction.cashOut;

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>{transaction.bankName}</TableCell>
                        <TableCell>{transaction.accountName}</TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            isDeposit ? "text-blue-500" : "text-purple-500"
                          }`}
                        >
                          {isDeposit ? "+" : "-"} {formatCurrency(amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan="4" className="text-center">
                    No bank transactions recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="hidden">
        <ExpenseReportPrint
          ref={printRef}
          categoryTotals={categoryTotals}
          bankTotals={bankTotals}
          totalExpenses={totalExpenses}
          period={selectedPeriod}
          viewMode={viewMode}
        />
      </div>
    </div>
  );
}

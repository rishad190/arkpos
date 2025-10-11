"use client";
import { useState, useEffect, useMemo } from "react";
import { useData } from "@/app/data-context";
import { DateRangePicker } from "@/components/DateRangePicker";
import { subDays } from "date-fns";
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
import {
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  FileText,
  Printer,
} from "lucide-react";
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

export default function ExpenseReportPage() {
  const { dailyCashTransactions, getExpenseCategories } = useData();
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 2),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const categories = await getExpenseCategories();
      setAllCategories(categories);
    };
    fetchCategories();
  }, [getExpenseCategories]);

  // --- Memoized Selectors for Data Processing ---

  // Filtered transactions for summaries
  const filteredTransactions = useMemo(() => {
    if (!dailyCashTransactions) return [];
    return dailyCashTransactions.filter((t) => {
      if (!dateRange || !dateRange.from || !dateRange.to) return true;
      const transactionDate = new Date(t.date);
      return transactionDate >= dateRange.from && transactionDate <= dateRange.to;
    });
  }, [dailyCashTransactions, dateRange]);

  // Totals for summary cards, based on filtered data
  const categoryTotals = useMemo(() => {
    if (!allCategories.length || !filteredTransactions) return {};
    const initialTotals = allCategories.reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {});
    return filteredTransactions.reduce((acc, transaction) => {
      if (transaction.transactionType === "cash" && transaction.cashOut > 0) {
        const category = transaction.category || "Uncategorized";
        acc[category] = (acc[category] || 0) + transaction.cashOut;
      }
      return acc;
    }, initialTotals);
  }, [filteredTransactions, allCategories]);

  const bankTotals = useMemo(() => {
    if (!filteredTransactions) return { deposits: 0, withdrawals: 0 };
    return filteredTransactions.reduce(
      (acc, transaction) => {
        if (transaction.transactionType === "bank_deposit") {
          acc.deposits += transaction.cashIn || 0;
        } else if (transaction.transactionType === "bank_withdrawal") {
          acc.withdrawals += transaction.cashOut || 0;
        }
        return acc;
      },
      { deposits: 0, withdrawals: 0 }
    );
  }, [filteredTransactions]);

  // Unfiltered data for detailed tables
  const allExpenseTransactions = useMemo(() => {
    if (!dailyCashTransactions) return [];
    return dailyCashTransactions.filter(
      (t) => t.transactionType === "cash" && t.cashOut > 0
    );
  }, [dailyCashTransactions]);

  const allBankTransactions = useMemo(() => {
    if (!dailyCashTransactions) return [];
    return dailyCashTransactions.filter(
      (t) =>
        t.transactionType === "bank_deposit" ||
        t.transactionType === "bank_withdrawal"
    );
  }, [dailyCashTransactions]);

  // Effect for loading state
  useEffect(() => {
    if (dailyCashTransactions && allCategories.length) {
      setLoading(false);
    }
  }, [dailyCashTransactions, allCategories]);

  // Get total expenses
  const totalExpenses = Object.values(categoryTotals).reduce(
    (sum, amount) => sum + amount,
    0
  );

  const handleExportCSV = () => {
    const data = Object.entries(categoryTotals).map(([category, amount]) => ({
      Category: category,
      Amount: amount,
      Percentage: ((amount / totalExpenses) * 100).toFixed(2) + "%",
    }));
    exportToCSV(data, "expense-report.csv");
  };

  const handleExportPDF = () => {
    const data = {
      title: "Expense Report",
      date: new Date().toLocaleDateString(),
      categories: categoryTotals,
      bankTotals,
      totalExpenses,
    };
    exportToPDF(data, "expense-report.pdf");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Expense Report</title>
            <style>
              body { font-family: Arial, sans-serif; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .summary { margin-bottom: 20px; }
              .summary-item { margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1>Expense Report</h1>
            <div class="summary">
              <div class="summary-item">Total Expenses: ৳${totalExpenses.toLocaleString()}</div>
              <div class="summary-item">Bank Deposits: ৳${bankTotals.deposits.toLocaleString()}</div>
              <div class="summary-item">Bank Withdrawals: ৳${bankTotals.withdrawals.toLocaleString()}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(categoryTotals)
                  .map(
                    ([category, amount]) => `
                  <tr>
                    <td>${category}</td>
                    <td>৳${amount.toLocaleString()}</td>
                    <td>${((amount / totalExpenses) * 100).toFixed(2)}%</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Report</h1>
          <p className="text-muted-foreground mt-1">
            Detailed analysis of your expenses and bank transactions
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
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
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="flex items-center gap-4">
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          className="w-full md:w-auto"
        />
        <Button
          variant="outline"
          onClick={() =>
            setDateRange({
              from: subDays(new Date(), 2),
              to: new Date(),
            })
          }
        >
          Reset to Last 2 Days
        </Button>
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
              ৳{totalExpenses.toLocaleString()}
            </div>
            <Progress value={100} className="h-2 mt-2" />
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
                ৳{bankTotals.deposits.toLocaleString()}
              </div>
            </div>
            <Progress value={100} className="h-2 mt-2 bg-blue-100" />
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
                ৳{bankTotals.withdrawals.toLocaleString()}
              </div>
            </div>
            <Progress value={100} className="h-2 mt-2 bg-purple-100" />
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
            {Object.entries(categoryTotals)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        ৳{amount.toLocaleString()}
                      </span>
                      <Badge variant="outline">
                        {((amount / totalExpenses) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress
                    value={(amount / totalExpenses) * 100}
                    className="h-2"
                  />
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Expense Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Expense Transactions</CardTitle>
          <CardDescription>
            A detailed list of all cash expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allExpenseTransactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {transaction.category || "Uncategorized"}
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell className="text-right text-red-500">
                      - ৳{transaction.cashOut.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bank Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Transactions</CardTitle>
          <CardDescription>Recent bank activity</CardDescription>
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
              {allBankTransactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{transaction.bankName}</TableCell>
                    <TableCell>{transaction.accountName}</TableCell>
                    <TableCell
                      className={`text-right ${
                        transaction.transactionType === "bank_deposit"
                          ? "text-blue-500"
                          : "text-purple-500"
                      }`}
                    >
                      {transaction.transactionType === "bank_deposit"
                        ? "+"
                        : "-"}
                      ৳
                      {(transaction.transactionType === "bank_deposit"
                        ? transaction.cashIn
                        : transaction.cashOut
                      ).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
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
import { ArrowUpRight, ArrowDownRight, Building2 } from "lucide-react";

export function ExpenseReport({ transactions }) {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [categoryTotals, setCategoryTotals] = useState({});
  const [bankTotals, setBankTotals] = useState({
    deposits: 0,
    withdrawals: 0,
  });

  useEffect(() => {
    // Filter transactions for selected month
    const monthTransactions = transactions.filter((t) =>
      t.date.startsWith(selectedMonth)
    );

    // Calculate category totals
    const categoryData = monthTransactions.reduce((acc, transaction) => {
      if (transaction.transactionType === "cash" && transaction.cashOut > 0) {
        const category = transaction.category || "Uncategorized";
        acc[category] = (acc[category] || 0) + transaction.cashOut;
      }
      return acc;
    }, {});

    // Calculate bank totals
    const bankData = monthTransactions.reduce(
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

    setCategoryTotals(categoryData);
    setBankTotals(bankData);
  }, [transactions, selectedMonth]);

  // Get total expenses
  const totalExpenses = Object.values(categoryTotals).reduce(
    (sum, amount) => sum + amount,
    0
  );

  // Generate months for dropdown
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date.toISOString().slice(0, 7);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Expense Report</h2>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month} value={month}>
                {new Date(month).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <span className="text-sm font-medium">
                        ৳{amount.toLocaleString()}
                      </span>
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

        <Card>
          <CardHeader>
            <CardTitle>Bank Transactions</CardTitle>
            <CardDescription>Recent bank activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions
                .filter(
                  (t) =>
                    t.transactionType === "bank_deposit" ||
                    t.transactionType === "bank_withdrawal"
                )
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex justify-between items-center p-2 rounded-lg bg-muted/50"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {transaction.bankName} - {transaction.accountName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div
                      className={`text-sm font-medium ${
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
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

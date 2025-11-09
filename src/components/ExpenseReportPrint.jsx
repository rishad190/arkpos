import React from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

const ExpenseReportPrint = React.forwardRef(
  (
    {
      categoryTotals,
      bankTotals,
      totalExpenses,
      period,
      viewMode,
    },
    ref
  ) => {
    const title = `Expense Report for ${
      viewMode === "monthly"
        ? new Date(period + "-02").toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          })
        : period
    }`;

    return (
      <div ref={ref} className="p-8 font-sans">
        <style type="text/css" media="print">
          {
            "@page { size: auto;  margin: 0mm; } body { background-color:#FFFFFF; border: solid 1px black; margin: 0px; }"
          }
        </style>
        <h1 className="text-2xl font-bold mb-2 text-center">{title}</h1>
        <p className="text-center text-sm text-gray-500 mb-8">
          Generated on {formatDate(new Date())}
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
          <div>
            <h3 className="text-sm font-medium text-gray-500">
              Total Expenses
            </h3>
            <p className="text-xl font-bold">{formatCurrency(totalExpenses)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">
              Bank Deposits
            </h3>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(bankTotals.deposits)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">
              Bank Withdrawals
            </h3>
            <p className="text-xl font-bold text-purple-600">
              {formatCurrency(bankTotals.withdrawals)}
            </p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4 border-b pb-2">
          Expense Categories
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Category</th>
              <th className="text-right py-2">Amount</th>
              <th className="text-right py-2">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(categoryTotals)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <tr key={category} className="border-b">
                  <td className="py-2">{category}</td>
                  <td className="text-right py-2">{formatCurrency(amount)}</td>
                  <td className="text-right py-2">
                    {totalExpenses > 0
                      ? `${((amount / totalExpenses) * 100).toFixed(1)}%`
                      : "0%"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  }
);

ExpenseReportPrint.displayName = "ExpenseReportPrint";

export default ExpenseReportPrint;

"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

import { useMemo } from "react";

export const RecentTransactions = React.memo(function RecentTransactions({
  transactions,
  customers,
}) {
  console.log("Rebuilding RecentTransactions");
  const router = useRouter();

  const customerMap = useMemo(() => {
    return customers.reduce((acc, customer) => {
      acc[customer.id] = customer.name;
      return acc;
    }, {});
  }, [customers]);

  return (
    <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest customer transactions</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/cashbook")}
        >
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <div>
                  <p className="font-medium">
                    {customerMap[transaction.customerId] || "Unknown Customer"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    Taka {transaction.total?.toLocaleString()}
                  </p>
                  <Badge
                    variant={
                      transaction.deposit >= transaction.total
                        ? "success"
                        : "warning"
                    }
                  >
                    {transaction.deposit >= transaction.total
                      ? "Paid"
                      : "Partial"}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent transactions
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

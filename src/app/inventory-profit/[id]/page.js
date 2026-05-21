"use client";
import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { useInventory } from "@/contexts/inventory-context";
import { useTransactions } from "@/contexts/transaction-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataErrorBoundary } from "@/components/shared/ErrorBoundary";
import { DollarSign, ShoppingCart, TrendingUp, HelpCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export default function FabricProfitDetailPage() {
  const { id } = useParams();
  const { fabrics } = useInventory();
  const { transactions } = useTransactions();

  const fabric = useMemo(() => {
    if (!fabrics) return null;
    return fabrics.find((f) => f.id === id);
  }, [fabrics, id]);

  const fabricTransactions = useMemo(() => {
    if (!transactions || !id) return [];
    return transactions
      .filter((t) => t.products?.some((p) => p.fabricId === id))
      .map((t) => {
        const product = t.products.find((p) => p.fabricId === id);
        return {
          ...t,
          quantitySold: product.quantity || 0,
          profit: product.profit || 0,
        };
      });
  }, [transactions, id]);

  const summaryStats = useMemo(() => {
    if (!fabricTransactions) return { totalProfit: 0, totalQuantitySold: 0, profitMargin: 0 };

    const totalProfit = fabricTransactions.reduce((acc, t) => acc + t.profit, 0);
    const totalQuantitySold = fabricTransactions.reduce((acc, t) => acc + t.quantitySold, 0);
    const totalRevenue = fabricTransactions.reduce((acc, t) => {
        const product = t.products.find((p) => p.fabricId === id);
        return acc + (product.price || 0) * (product.quantity || 0);
    }, 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return { totalProfit, totalQuantitySold, profitMargin };
  }, [fabricTransactions, id]);

  if (!fabric) {
    return <div>Loading...</div>;
  }

  return (
    <DataErrorBoundary>
      <TooltipProvider delayDuration={150}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">{fabric.name}</h1>
      <p className="text-muted-foreground mb-8">{fabric.code}</p>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Total Profit
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-normal text-xs text-left max-w-xs">
                    Accumulated profit for this fabric, matching sales against chronological import batch costs (FIFO).
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳{summaryStats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.totalQuantitySold.toFixed(2)} {fabric.unit}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Profit Margin
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-normal text-xs text-left max-w-xs">
                    Profit margin percentage calculated as (Total Profit ÷ Total Revenue) × 100.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.profitMargin.toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead className="text-right">Quantity Sold</TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1.5">
                    Profit
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-normal text-xs text-left max-w-xs">
                          Profit for this transaction, calculated as revenue minus cost of goods sold from depleted FIFO batches.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fabricTransactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{t.id}</TableCell>
                  <TableCell className="text-right">{t.quantitySold.toFixed(2)} {fabric.unit}</TableCell>
                  <TableCell className="text-right">
                    ৳{t.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
      </TooltipProvider>
    </DataErrorBoundary>
  );
}

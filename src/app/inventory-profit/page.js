"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/app/data-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, ArrowUpDown } from "lucide-react";

import { DataErrorBoundary } from "@/components/ErrorBoundary";
import { useRouter } from "next/navigation";

export default function InventoryProfitPage() {
  const { fabrics, transactions } = useData();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [sortConfig, setSortConfig] = useState({ key: "totalProfit", direction: "desc" });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!dateRange.startDate || !dateRange.endDate) return transactions;

    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end day

    return transactions.filter((t) => {
      const transactionDate = new Date(t.createdAt);
      return transactionDate >= start && transactionDate <= end;
    });
  }, [transactions, dateRange]);

  const inventoryProfit = useMemo(() => {
    if (!fabrics || !filteredTransactions) return [];

    let data = fabrics.map((fabric) => {
      const fabricTransactions = filteredTransactions.filter((t) =>
        t.products?.some((p) => p.fabricId === fabric.id)
      );

      let totalQuantitySold = 0;
      let totalProfit = 0;
      let totalRevenue = 0;

      fabricTransactions.forEach((t) => {
        t.products?.forEach((p) => {
          if (p.fabricId === fabric.id) {
            totalQuantitySold += p.quantity || 0;
            totalProfit += p.profit || 0;
            totalRevenue += (p.price || 0) * (p.quantity || 0);
          }
        });
      });

      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return {
        ...fabric,
        totalQuantitySold,
        totalProfit,
        profitMargin,
      };
    });

    if (searchTerm) {
      data = data.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig.key) {
      data.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return data;
  }, [fabrics, filteredTransactions, searchTerm, sortConfig]);

  const totalInventoryProfit = useMemo(() => {
    return inventoryProfit.reduce((acc, item) => acc + item.totalProfit, 0);
  }, [inventoryProfit]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return (
    <DataErrorBoundary>
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-8">
        Inventory Profit
      </h1>

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Inventory Profit
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ৳{totalInventoryProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mb-4">
        <Input
          placeholder="Search by fabric name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex space-x-2">
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          />
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit by Fabric</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort("name")}>
                  <Button variant="ghost">Fabric Name <ArrowUpDown className="ml-2 h-4 w-4" /></Button>
                </TableHead>
                <TableHead>Fabric Code</TableHead>
                <TableHead className="text-right" onClick={() => requestSort("totalQuantitySold")}>
                  <Button variant="ghost">Total Quantity Sold <ArrowUpDown className="ml-2 h-4 w-4" /></Button>
                </TableHead>
                <TableHead className="text-right" onClick={() => requestSort("profitMargin")}>
                  <Button variant="ghost">Profit Margin <ArrowUpDown className="ml-2 h-4 w-4" /></Button>
                </TableHead>
                <TableHead className="text-right" onClick={() => requestSort("totalProfit")}>
                  <Button variant="ghost">Total Profit <ArrowUpDown className="ml-2 h-4 w-4" /></Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryProfit.map((item) => (
                <TableRow key={item.id} onClick={() => router.push(`/inventory-profit/${item.id}`)} className="cursor-pointer">
                  <TableCell className="font-medium">
                    {item.name}
                  </TableCell>
                  <TableCell>{item.code}</TableCell>
                  <TableCell className="text-right">
                    {item.totalQuantitySold.toFixed(2)} {item.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.profitMargin.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    ৳{item.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </DataErrorBoundary>
  );
}
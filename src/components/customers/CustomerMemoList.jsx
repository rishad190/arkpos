"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Search, ArrowUpDown } from "lucide-react";

/**
 * CustomerMemoList Component
 * Displays customer transactions grouped by memo with outstanding dues
 * 
 * @param {Object} props
 * @param {Array<MemoGroup>} props.memoGroups - Array of memo groups with payment details
 * @param {Function} props.onMemoClick - Callback when a memo is clicked
 * @param {Function} props.onAddPayment - Callback when add payment is clicked
 * @param {boolean} props.showOnlyDues - Filter to show only memos with outstanding dues
 */
export function CustomerMemoList({ 
  memoGroups = [], 
  onMemoClick,
  onAddPayment,
  showOnlyDues = false 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "saleDate", direction: "desc" });

  // Filter memos based on search and dues filter
  const filteredMemos = useMemo(() => {
    let filtered = memoGroups;

    // Filter by dues if enabled
    if (showOnlyDues) {
      filtered = filtered.filter((memo) => memo.dueAmount > 0);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (memo) =>
          memo.memoNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          memo.totalAmount?.toString().includes(searchTerm) ||
          memo.dueAmount?.toString().includes(searchTerm)
      );
    }

    return filtered;
  }, [memoGroups, searchTerm, showOnlyDues]);

  // Sort memos
  const sortedMemos = useMemo(() => {
    const sorted = [...filteredMemos];

    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle date sorting
      if (sortConfig.key === "saleDate") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }

      // Handle numeric sorting
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      // Handle date sorting
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      // Handle string sorting
      const aStr = String(aValue || "");
      const bStr = String(bValue || "");
      return sortConfig.direction === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    return sorted;
  }, [filteredMemos, sortConfig]);

  // Toggle sort direction or change sort key
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case "paid":
        return "default";
      case "partial":
        return "secondary";
      case "unpaid":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case "paid":
        return "Paid";
      case "partial":
        return "Partial";
      case "unpaid":
        return "Unpaid";
      default:
        return "Unknown";
    }
  };

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Memo-wise Transactions
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {showOnlyDues
                ? "Showing memos with outstanding dues"
                : "All customer memos"}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by memo number or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedMemos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>
              {showOnlyDues
                ? "No memos with outstanding dues"
                : "No memos found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[400px] sm:max-h-[500px] md:max-h-[600px]">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("memoNumber")}
                      className="h-8 px-2"
                    >
                      Memo Number
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("saleDate")}
                      className="h-8 px-2"
                    >
                      Date
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("totalAmount")}
                      className="h-8 px-2"
                    >
                      Total Amount
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("paidAmount")}
                      className="h-8 px-2"
                    >
                      Paid
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("dueAmount")}
                      className="h-8 px-2"
                    >
                      Due Amount
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMemos.map((memo) => (
                  <TableRow
                    key={memo.memoNumber}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onMemoClick && onMemoClick(memo)}
                  >
                    <TableCell className="font-medium">
                      {memo.memoNumber}
                    </TableCell>
                    <TableCell>
                      {memo.saleDate
                        ? new Date(memo.saleDate)
                            .toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                            .replace(/\//g, "-")
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      ৳{memo.totalAmount?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ৳{memo.paidAmount?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        memo.dueAmount > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      ৳{memo.dueAmount?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(memo.status)}>
                        {getStatusLabel(memo.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMemoClick && onMemoClick(memo);
                          }}
                        >
                          View Details
                        </Button>
                        {memo.dueAmount > 0 && onAddPayment && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddPayment(memo);
                            }}
                          >
                            Add Payment
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {sortedMemos.length > 0 && (
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Total Memos: {sortedMemos.length}
            </p>
            <div className="text-sm">
              <span className="font-medium">Total Due: </span>
              <span className="text-red-600 font-bold">
                ৳
                {sortedMemos
                  .reduce((sum, memo) => sum + (memo.dueAmount || 0), 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

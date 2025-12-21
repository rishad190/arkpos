"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Receipt,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * MemoDetailsDialog Component
 * Shows detailed information about a memo including all payment transactions
 * 
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Callback when dialog open state changes
 * @param {Object} props.memoDetails - Memo details object with sale and payment transactions
 * @param {Function} props.onAddPayment - Callback to add a new payment
 */
export function MemoDetailsDialog({ 
  open, 
  onOpenChange, 
  memoDetails,
  onAddPayment 
}) {
  if (!memoDetails) {
    return null;
  }

  const {
    memoNumber,
    saleTransaction,
    paymentTransactions = [],
    totalAmount = 0,
    totalPaid = 0,
    remainingDue = 0,
    status = "unpaid",
  } = memoDetails;

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
        return "Fully Paid";
      case "partial":
        return "Partially Paid";
      case "unpaid":
        return "Unpaid";
      default:
        return "Unknown";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5" />
                Memo Details: {memoNumber}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Complete payment history and transaction details
              </DialogDescription>
            </div>
            <Badge variant={getStatusVariant(status)} className="text-sm">
              {getStatusLabel(status)}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Sale Transaction Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Original Sale
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {saleTransaction?.date
                        ? new Date(saleTransaction.date)
                            .toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                            .replace(/\//g, "-")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Amount
                    </p>
                    <p className="font-medium text-blue-600 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />৳
                      {totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Initial Deposit
                    </p>
                    <p className="font-medium text-green-600 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />৳
                      {(saleTransaction?.deposit || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Initial Due
                    </p>
                    <p className="font-medium text-orange-600">
                      ৳
                      {(
                        totalAmount - (saleTransaction?.deposit || 0)
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
                {saleTransaction?.details && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">
                      Details
                    </p>
                    <p className="text-sm">{saleTransaction.details}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment History
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {paymentTransactions.length} Payment
                    {paymentTransactions.length !== 1 ? "s" : ""}
                  </Badge>
                  {remainingDue > 0 && onAddPayment && (
                    <Button
                      size="sm"
                      onClick={onAddPayment}
                      className="h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Payment
                    </Button>
                  )}
                </div>
              </div>

              {paymentTransactions.length === 0 ? (
                <Card className="bg-muted/30">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No payments recorded yet</p>
                    <p className="text-sm mt-1">
                      Add a payment to reduce the outstanding balance
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentTransactions.map((payment, index) => (
                          <TableRow key={payment.id || index}>
                            <TableCell>
                              {payment.date
                                ? new Date(payment.date)
                                    .toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })
                                    .replace(/\//g, "-")
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              ৳
                              {(
                                payment.amount ||
                                payment.deposit ||
                                0
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {payment.paymentMethod || "Cash"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {payment.note || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Financial Summary */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-semibold text-lg">
                      ৳{totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Paid:</span>
                    <span className="font-semibold text-lg text-green-600">
                      ৳{totalPaid.toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Remaining Due:</span>
                    <span
                      className={`font-bold text-xl ${
                        remainingDue > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      ৳{remainingDue.toLocaleString()}
                    </span>
                  </div>
                  {remainingDue > 0 && (
                    <div className="pt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              (totalPaid / totalAmount) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {((totalPaid / totalAmount) * 100).toFixed(1)}% paid
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

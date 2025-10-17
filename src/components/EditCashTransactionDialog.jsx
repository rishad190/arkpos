"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function EditCashTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onEditTransaction,
}) {
  const [formData, setFormData] = useState(() => ({
    date: transaction?.date || new Date().toISOString().split("T")[0],
    description: transaction?.description || "",
    cashIn: transaction?.cashIn || 0,
    cashOut: transaction?.cashOut || 0,
  }));

  const [transactionType, setTransactionType] = useState(() =>
    (transaction?.cashIn || 0) > 0 ? "in" : "out"
  );

  useEffect(() => {
    if (transaction && open) {
      setFormData({
        date: transaction.date,
        description: transaction.description,
        cashIn: transaction.cashIn || 0,
        cashOut: transaction.cashOut || 0,
      });
      setTransactionType(transaction.cashIn > 0 ? "in" : "out");
    }
  }, [transaction, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedTransaction = {
        ...formData,
        cashIn: transactionType === "in" ? Number(formData.cashIn) : 0,
        cashOut: transactionType === "out" ? Number(formData.cashOut) : 0,
      };

      await onEditTransaction(transaction.id, updatedTransaction);
      onOpenChange(false);

      setFormData({
        date: transaction?.date || new Date().toISOString().split("T")[0],
        description: transaction?.description || "",
        cashIn: transaction?.cashIn || 0,
        cashOut: transaction?.cashOut || 0,
      });
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setFormData({
            date: transaction?.date || new Date().toISOString().split("T")[0],
            description: transaction?.description || "",
            cashIn: transaction?.cashIn || 0,
            cashOut: transaction?.cashOut || 0,
          });
          setTransactionType((transaction?.cashIn || 0) > 0 ? "in" : "out");
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent
        className="sm:max-w-[425px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-transaction-title"
        aria-describedby="edit-transaction-description"
      >
        <DialogHeader>
          <DialogTitle
            id="edit-transaction-title"
            className="text-xl font-semibold"
          >
            Edit Cash Transaction
          </DialogTitle>
          <p
            id="edit-transaction-description"
            className="text-sm text-muted-foreground"
          >
            Update the transaction details below.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant={transactionType === "in" ? "default" : "outline"}
              onClick={() => setTransactionType("in")}
              className={`h-24 flex flex-col items-center justify-center gap-2 ${
                transactionType === "in"
                  ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  : ""
              }`}
              aria-pressed={transactionType === "in"}
              aria-label="Select Cash In transaction type"
            >
              <ArrowUpRight
                className={`h-6 w-6 ${
                  transactionType === "in" ? "text-green-600" : "text-gray-400"
                }`}
                aria-hidden="true"
              />
              <span>Cash In</span>
            </Button>

            <Button
              type="button"
              variant={transactionType === "out" ? "default" : "outline"}
              onClick={() => setTransactionType("out")}
              className={`h-24 flex flex-col items-center justify-center gap-2 ${
                transactionType === "out"
                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  : ""
              }`}
              aria-pressed={transactionType === "out"}
              aria-label="Select Cash Out transaction type"
            >
              <ArrowDownRight
                className={`h-6 w-6 ${
                  transactionType === "out" ? "text-red-600" : "text-gray-400"
                }`}
                aria-hidden="true"
              />
              <span>Cash Out</span>
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transaction-date" className="text-sm font-medium">
                Date
              </Label>
              <Input
                id="transaction-date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="transaction-description"
                className="text-sm font-medium"
              >
                Description
              </Label>
              <Input
                id="transaction-description"
                placeholder="Enter transaction description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full"
                required
                aria-invalid={!formData.description}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="transaction-amount"
                className="text-sm font-medium"
              >
                Amount
              </Label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  aria-hidden
                >
                  ৳
                </span>
                <Input
                  id="transaction-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={
                    transactionType === "in"
                      ? formData.cashIn
                      : formData.cashOut
                  }
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (transactionType === "in") {
                      setFormData({ ...formData, cashIn: value, cashOut: 0 });
                    } else {
                      setFormData({ ...formData, cashOut: value, cashIn: 0 });
                    }
                  }}
                  className="pl-8 w-full"
                  required
                  aria-label={`${
                    transactionType === "in" ? "Cash in" : "Cash out"
                  } amount`}
                  aria-invalid={
                    transactionType === "in"
                      ? !formData.cashIn || formData.cashIn <= 0
                      : !formData.cashOut || formData.cashOut <= 0
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-24"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={`w-32 ${
                transactionType === "in"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

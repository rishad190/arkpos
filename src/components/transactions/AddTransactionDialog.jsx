"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Receipt } from "lucide-react";

export function AddTransactionDialog({ customerId, onAddTransaction }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    memoNumber: "",
    details: "",
    total: "", // Changed from 0 to empty string for better form handling
    deposit: "", // Changed from 0 to empty string
    storeId: "STORE1",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    // Required field validations
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.memoNumber) newErrors.memoNumber = "Memo number is required";

    // Total amount validation (optional but must be valid if provided)
    if (formData.total && formData.total.trim() !== "") {
      const totalAmount = parseFloat(formData.total);
      if (isNaN(totalAmount)) {
        newErrors.total = "Please enter a valid amount";
      } else if (totalAmount < 0) {
        newErrors.total = "Amount cannot be negative";
      }
    }

    // Deposit amount validation (only validate for valid number and non-negative)
    if (formData.deposit && formData.deposit.trim() !== "") {
      const depositAmount = parseFloat(formData.deposit);
      if (isNaN(depositAmount)) {
        newErrors.deposit = "Please enter a valid amount";
      } else if (depositAmount < 0) {
        newErrors.deposit = "Deposit cannot be negative";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Handle empty values properly
      const totalAmount = formData.total ? parseFloat(formData.total) : 0;
      const depositAmount = formData.deposit ? parseFloat(formData.deposit) : 0;

      const newTransaction = {
        ...formData,
        customerId,
        total: totalAmount || 0, // Ensure 0 if NaN
        deposit: depositAmount || 0, // Ensure 0 if NaN
        due: (totalAmount || 0) - (depositAmount || 0),
      };

      await onAddTransaction(newTransaction);
      setOpen(false);
      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        memoNumber: "",
        details: "",
        total: "",
        deposit: "",
        storeId: "STORE1",
      });
      setErrors({});
    } catch (error) {
      console.error("Error submitting transaction:", error);
      setErrors({ submit: "Failed to add transaction. Please try again." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Transaction</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            New Transaction
          </DialogTitle>
          <DialogDescription>
            Create a new transaction for this customer
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}
          <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className={errors.date ? "border-red-500" : ""}
              />
              {errors.date && (
                <p className="text-red-500 text-sm">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="memoNumber">
                Memo Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="memoNumber"
                placeholder="e.g., MEMO-2024-001"
                value={formData.memoNumber}
                onChange={(e) =>
                  setFormData({ ...formData, memoNumber: e.target.value })
                }
                className={errors.memoNumber ? "border-red-500" : ""}
              />
              {errors.memoNumber && (
                <p className="text-red-500 text-sm">{errors.memoNumber}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter a unique memo number for this transaction
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Details</Label>
              <Input
                id="details"
                placeholder="Enter transaction details (optional)"
                value={formData.details}
                onChange={(e) =>
                  setFormData({ ...formData, details: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total">
                Total Bill <span className="text-red-500">*</span>
              </Label>
              <Input
                id="total"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.total}
                onChange={(e) =>
                  setFormData({ ...formData, total: e.target.value })
                }
                className={errors.total ? "border-red-500" : ""}
              />
              {errors.total && (
                <p className="text-red-500 text-sm">{errors.total}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit">Initial Deposit</Label>
              <Input
                id="deposit"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.deposit}
                onChange={(e) =>
                  setFormData({ ...formData, deposit: e.target.value })
                }
                className={errors.deposit ? "border-red-500" : ""}
              />
              {errors.deposit && (
                <p className="text-red-500 text-sm">{errors.deposit}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Amount paid at the time of transaction
              </p>
            </div>

            {/* Due Amount Display */}
            {formData.total && formData.deposit && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Due Amount:</span>
                  <span className="text-lg font-bold text-red-600">
                    ৳
                    {(
                      (parseFloat(formData.total) || 0) -
                      (parseFloat(formData.deposit) || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="storeId">Store</Label>
              <select
                id="storeId"
                className={`w-full border rounded-md px-3 py-2 ${
                  errors.storeId ? "border-red-500" : ""
                }`}
                value={formData.storeId}
                onChange={(e) =>
                  setFormData({ ...formData, storeId: e.target.value })
                }
              >
                <option value="STORE1">Store 1</option>
                <option value="STORE2">Store 2</option>
              </select>
              {errors.storeId && (
                <p className="text-red-500 text-sm">{errors.storeId}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Transaction</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

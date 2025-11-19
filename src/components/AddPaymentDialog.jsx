"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * AddPaymentDialog Component
 * Dialog for adding a payment to a specific memo
 * 
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Callback when dialog open state changes
 * @param {string} props.memoNumber - The memo number to add payment to
 * @param {number} props.remainingDue - The remaining due amount for the memo
 * @param {Function} props.onAddPayment - Callback to add payment (receives paymentData)
 * @param {boolean} props.isLoading - Loading state during payment submission
 */
export function AddPaymentDialog({
  open,
  onOpenChange,
  memoNumber,
  remainingDue = 0,
  onAddPayment,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    note: "",
  });
  const [errors, setErrors] = useState({});

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setFormData({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        paymentMethod: "cash",
        note: "",
      });
      setErrors({});
    }
  }, [open]);

  // Validate form data
  const validate = () => {
    const newErrors = {};

    // Amount validation
    if (!formData.amount || formData.amount.trim() === "") {
      newErrors.amount = "Payment amount is required";
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) {
        newErrors.amount = "Please enter a valid amount";
      } else if (amount <= 0) {
        newErrors.amount = "Amount must be greater than zero";
      } else if (amount > remainingDue) {
        newErrors.amount = `Amount cannot exceed remaining due (৳${remainingDue.toLocaleString()})`;
      }
    }

    // Date validation
    if (!formData.date) {
      newErrors.date = "Payment date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const paymentData = {
        amount: parseFloat(formData.amount),
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        note: formData.note.trim(),
      };

      await onAddPayment(paymentData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding payment:", error);
      setErrors({ submit: error.message || "Failed to add payment" });
    }
  };

  // Handle input change
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for memo <strong>{memoNumber}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Remaining Due Display */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Remaining Due:
              </span>
              <Badge variant="destructive" className="text-base">
                ৳{remainingDue.toLocaleString()}
              </Badge>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Payment Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter payment amount"
              value={formData.amount}
              onChange={(e) => handleChange("amount", e.target.value)}
              className={errors.amount ? "border-red-500" : ""}
              disabled={isLoading}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* Date Input */}
          <div className="space-y-2">
            <Label htmlFor="date">
              Payment Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              className={errors.date ? "border-red-500" : ""}
              disabled={isLoading}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date}</p>
            )}
          </div>

          {/* Payment Method Select */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <select
              id="paymentMethod"
              className="w-full border rounded-md px-3 py-2"
              value={formData.paymentMethod}
              onChange={(e) => handleChange("paymentMethod", e.target.value)}
              disabled={isLoading}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
              <option value="mobile_payment">Mobile Payment</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Note Textarea */}
          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Add any additional notes about this payment..."
              value={formData.note}
              onChange={(e) => handleChange("note", e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Submit Error Alert */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Dialog Footer */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding Payment..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

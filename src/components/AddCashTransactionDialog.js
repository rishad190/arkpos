"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AddCashTransactionDialog({
  onAddTransaction,
  children,
  expenseCategories,
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
    cashIn: "",
    cashOut: "",
    category: "",
  });
  const [errors, setErrors] = useState({});

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
        cashIn: "",
        cashOut: "",
        category: "",
      });
      setErrors({});
    }
  }, [open]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.description?.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.cashIn && !formData.cashOut) {
      newErrors.amount = "Either Cash In or Cash Out is required";
    }

    if (formData.cashOut && !formData.category) {
      newErrors.category = "Category is required for Cash Out transactions";
    }

    // Validate numeric values
    if (
      formData.cashIn &&
      (isNaN(formData.cashIn) || parseFloat(formData.cashIn) < 0)
    ) {
      newErrors.cashIn = "Please enter a valid amount";
    }

    if (
      formData.cashOut &&
      (isNaN(formData.cashOut) || parseFloat(formData.cashOut) < 0)
    ) {
      newErrors.cashOut = "Please enter a valid amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onAddTransaction({
        ...formData,
        cashIn: parseFloat(formData.cashIn) || 0,
        cashOut: parseFloat(formData.cashOut) || 0,
        category: formData.cashOut ? formData.category : "Income",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error adding transaction:", error);
      setErrors({ submit: "Failed to add transaction. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (type, value) => {
    setFormData((prev) => ({
      ...prev,
      [type]: value,
      [type === "cashIn" ? "cashOut" : "cashIn"]: "", // Clear the other amount
      category: type === "cashIn" ? "" : prev.category, // Clear category for cash in
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Cash Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                required
                className={errors.date ? "border-red-500" : ""}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    reference: e.target.value,
                  }))
                }
                placeholder="Optional reference"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter transaction description"
              required
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cashIn">Cash In</Label>
              <Input
                id="cashIn"
                type="number"
                value={formData.cashIn}
                onChange={(e) => handleAmountChange("cashIn", e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={errors.cashIn ? "border-red-500" : ""}
              />
              {errors.cashIn && (
                <p className="text-sm text-red-500">{errors.cashIn}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cashOut">Cash Out</Label>
              <Input
                id="cashOut"
                type="number"
                value={formData.cashOut}
                onChange={(e) => handleAmountChange("cashOut", e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={errors.cashOut ? "border-red-500" : ""}
              />
              {errors.cashOut && (
                <p className="text-sm text-red-500">{errors.cashOut}</p>
              )}
            </div>
          </div>

          {errors.amount && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.amount}</AlertDescription>
            </Alert>
          )}

          {formData.cashOut && (
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger
                  id="category"
                  className={errors.category ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-500">{errors.category}</p>
              )}
            </div>
          )}

          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Transaction"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

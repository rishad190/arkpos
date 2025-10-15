"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EditSupplierTransactionDialog({ transaction, onSave }) {
  const [errors, setErrors] = useState({});
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: transaction.date,
    invoiceNumber: transaction.invoiceNumber,
    details: transaction.details || "",
    totalAmount: transaction.totalAmount?.toString() || "0",
    paidAmount: transaction.paidAmount?.toString() || "0",
  });

  // Add handler for number inputs
  const handleNumberInput = (field, value) => {
    const numberValue = value === "" ? "0" : value;
    setFormData((prev) => ({
      ...prev,
      [field]: numberValue,
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.invoiceNumber?.trim())
      newErrors.invoiceNumber = "Invoice number is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const updatedTransaction = {
        ...formData,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        paidAmount: parseFloat(formData.paidAmount) || 0,
        due:
          parseFloat(formData.totalAmount) -
          (parseFloat(formData.paidAmount) || 0),
        updatedAt: new Date().toISOString(),
      };
      await onSave(transaction.id, updatedTransaction);
      setOpen(false);
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setErrors({});
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date *</label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className={errors.date ? "border-red-500" : ""}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Number *</label>
            <Input
              value={formData.invoiceNumber}
              onChange={(e) =>
                setFormData({ ...formData, invoiceNumber: e.target.value })
              }
              className={errors.invoiceNumber ? "border-red-500" : ""}
            />
            {errors.invoiceNumber && (
              <p className="text-sm text-red-500">{errors.invoiceNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Details</label>
            <Input
              value={formData.details}
              onChange={(e) =>
                setFormData({ ...formData, details: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Total Amount *</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.totalAmount}
              onChange={(e) => handleNumberInput("totalAmount", e.target.value)}
              className={errors.totalAmount ? "border-red-500" : ""}
            />
            {errors.totalAmount && (
              <p className="text-sm text-red-500">{errors.totalAmount}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Paid Amount</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.paidAmount}
              onChange={(e) => handleNumberInput("paidAmount", e.target.value)}
              className={errors.paidAmount ? "border-red-500" : ""}
            />
            {errors.paidAmount && (
              <p className="text-sm text-red-500">{errors.paidAmount}</p>
            )}
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500">{errors.submit}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

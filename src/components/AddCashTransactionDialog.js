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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddCashTransactionDialog({
  onAddTransaction,
  children,
  expenseCategories,
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
    cashIn: "",
    cashOut: "",
    category: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || (!formData.cashIn && !formData.cashOut)) {
      alert("Please fill in all required fields");
      return;
    }

    // Require category for cash out transactions
    if (formData.cashOut && !formData.category) {
      alert("Please select a category for cash out transaction");
      return;
    }

    try {
      await onAddTransaction({
        ...formData,
        cashIn: parseFloat(formData.cashIn) || 0,
        cashOut: parseFloat(formData.cashOut) || 0,
        category: formData.cashOut ? formData.category : "Income", // Default category for cash in
      });
      setOpen(false);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
        cashIn: "",
        cashOut: "",
        category: "",
      });
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Failed to add transaction. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Cash Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            />
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference (Optional)</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reference: e.target.value }))
              }
              placeholder="Enter reference number"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cashIn">Cash In</Label>
              <Input
                id="cashIn"
                type="number"
                value={formData.cashIn}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    cashIn: e.target.value,
                    cashOut: "", // Clear cash out when cash in is entered
                    category: "", // Clear category
                  }));
                }}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cashOut">Cash Out</Label>
              <Input
                id="cashOut"
                type="number"
                value={formData.cashOut}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    cashOut: e.target.value,
                    cashIn: "", // Clear cash in when cash out is entered
                  }));
                }}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          {/* Category Selection - Only show for cash out transactions */}
          {formData.cashOut ? (
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger id="category">
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
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Transaction</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

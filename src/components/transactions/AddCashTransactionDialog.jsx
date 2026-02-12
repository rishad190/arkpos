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
import { FormErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useTransactions } from "@/contexts/transaction-context";
import { CASH_TRANSACTION_CATEGORIES } from "@/lib/constants";

export function AddCashTransactionDialog({ onAddTransaction, children }) {
  const { transactionCategories, addCategory } = useTransactions();
  const [open, setOpen] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
    cashIn: "",
    cashOut: "",
    category: "",
  });

  // Merge default and custom categories
  const incomeCategories = [
    ...CASH_TRANSACTION_CATEGORIES.INCOME,
    ...(transactionCategories || []).filter(c => c.type === 'INCOME').map(c => c.name)
  ];
  
  const expenseCategories = [
    ...CASH_TRANSACTION_CATEGORIES.EXPENSE,
    ...(transactionCategories || []).filter(c => c.type === 'EXPENSE').map(c => c.name)
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cashIn = parseFloat(formData.cashIn) || 0;
    const cashOut = parseFloat(formData.cashOut) || 0;

    if (!formData.description || (cashIn === 0 && cashOut === 0)) {
      alert("Please fill in description and at least one cash field.");
      return;
    }

    try {
      const type = cashIn > 0 ? "INCOME" : "EXPENSE";
      const categoryName = formData.category || (cashIn > 0 ? "Other Income" : "Other Expense");

      // Save custom category if it's new
      if (isCustomCategory && formData.category && 
          !incomeCategories.includes(formData.category) && 
          !expenseCategories.includes(formData.category)) {
          await addCategory({
            name: formData.category,
            type: type
          });
      }

      await onAddTransaction({
        ...formData,
        cashIn: parseFloat(formData.cashIn) || 0,
        cashOut: parseFloat(formData.cashOut) || 0,
        category: categoryName,
      });
      // Keep dialog open and preserve date for adding multiple transactions
      // Only reset transaction-specific fields
      setFormData((prev) => ({
        ...prev,
        description: "",
        reference: "",
        cashIn: "",
        cashOut: "",
        category: "",
      }));
      setIsCustomCategory(false);
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Failed to add transaction. Please try again.");
    }
  };

  const availableCategories = [...incomeCategories, ...expenseCategories];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Cash Transaction</DialogTitle>
        </DialogHeader>
        <FormErrorBoundary>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="max-h-[60vh] overflow-y-auto pr-4">
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
                <Label htmlFor="category">Category</Label>
                <div className="space-y-2">
                  <Select
                    value={isCustomCategory ? "custom" : formData.category}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setIsCustomCategory(true);
                        setFormData((prev) => ({ ...prev, category: "" }));
                      } else {
                        setIsCustomCategory(false);
                        setFormData((prev) => ({ ...prev, category: value }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uncategorized">Select Category</SelectItem>
                      {/* Income Categories */}
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                        Income
                      </div>
                      {incomeCategories.map((cat) => (
                        <SelectItem key={`inc-${cat}`} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      {/* Expense Categories */}
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground mt-2">
                        Expense
                      </div>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={`exp-${cat}`} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <div className="border-t my-1" />
                      <SelectItem value="custom">Other / Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {isCustomCategory && (
                     <Input
                      placeholder="Enter custom category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      required
                     />
                  )}
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      reference: e.target.value,
                    }))
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cashIn: e.target.value,
                      }))
                    }
                    disabled={!!formData.cashOut}
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cashOut: e.target.value,
                      }))
                    }
                    disabled={!!formData.cashIn}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
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
        </FormErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}

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

export function AddCashTransactionDialog({ onAddTransaction, children }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
    cashIn: "",
    cashOut: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cashIn = parseFloat(formData.cashIn) || 0;
    const cashOut = parseFloat(formData.cashOut) || 0;

    if (!formData.description || (cashIn === 0 && cashOut === 0)) {
      alert("Please fill in description and at least one cash field.");
      return;
    }

    try {
      await onAddTransaction({
        ...formData,
        cashIn: parseFloat(formData.cashIn) || 0,
        cashOut: parseFloat(formData.cashOut) || 0,
      });
      setOpen(false);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
        cashIn: "",
        cashOut: "",
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

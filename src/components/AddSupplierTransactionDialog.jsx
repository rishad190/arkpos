import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function AddSupplierTransactionDialog({ supplierId, onAddTransaction }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    invoiceNumber: "",
    details: "",
    totalAmount: 0,
    paidAmount: 0,
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.invoiceNumber?.trim()) {
      newErrors.invoiceNumber = "Invoice number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const transaction = {
        ...formData,
        supplierId,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        paidAmount: parseFloat(formData.paidAmount) || 0,
        due:
          parseFloat(formData.totalAmount) -
            (parseFloat(formData.paidAmount) || 0) || 0,
        createdAt: new Date().toISOString(),
      };

      await onAddTransaction(transaction);
      setOpen(false);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        invoiceNumber: "",
        details: "",
        totalAmount: 0,
        paidAmount: 0,
      });
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Transaction</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Supplier Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Number *</label>
            <Input
              value={formData.invoiceNumber}
              onChange={(e) =>
                setFormData({ ...formData, invoiceNumber: e.target.value })
              }
              className={errors.invoiceNumber ? "border-red-500" : ""}
              placeholder="Enter invoice number"
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
              placeholder="Enter transaction details"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Amount *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.totalAmount}
                onChange={(e) =>
                  setFormData({ ...formData, totalAmount: e.target.value })
                }
                className={errors.totalAmount ? "border-red-500" : ""}
                placeholder="Enter total amount"
              />
              {errors.totalAmount && (
                <p className="text-sm text-red-500">{errors.totalAmount}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Paid Amount</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.paidAmount}
                onChange={(e) =>
                  setFormData({ ...formData, paidAmount: e.target.value })
                }
                className={errors.paidAmount ? "border-red-500" : ""}
                placeholder="Enter paid amount"
              />
              {errors.paidAmount && (
                <p className="text-sm text-red-500">{errors.paidAmount}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500">{errors.submit}</p>
          )}

          <div className="flex justify-end gap-3">
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

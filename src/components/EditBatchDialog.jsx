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

export function EditBatchDialog({ batch, fabric, onSave }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    quantity: batch.quantity,
    unitCost: batch.unitCost,
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }
    if (!formData.unitCost || formData.unitCost <= 0) {
      newErrors.unitCost = "Unit cost must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSave(batch.id, formData);
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
          <DialogTitle>Edit Batch Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Quantity ({fabric.unit})*
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity: parseFloat(e.target.value),
                })
              }
              className={errors.quantity ? "border-red-500" : ""}
            />
            {errors.quantity && (
              <p className="text-sm text-red-500">{errors.quantity}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Unit Cost *</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.unitCost}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  unitCost: parseFloat(e.target.value),
                })
              }
              className={errors.unitCost ? "border-red-500" : ""}
            />
            {errors.unitCost && (
              <p className="text-sm text-red-500">{errors.unitCost}</p>
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

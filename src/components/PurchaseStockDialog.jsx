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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Update the component props to include suppliers
export function PurchaseStockDialog({
  fabrics,
  suppliers = [],
  onPurchaseStock,
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    fabricId: "",
    quantity: "",
    unitCost: "",
    supplierId: "",
    supplierName: "",
    supplierPhone: "",
    invoiceNumber: "",
    purchaseDate: new Date().toISOString().split("T")[0],
  });
  const [errors, setErrors] = useState({});
  const [isNewSupplier, setIsNewSupplier] = useState(false);

  // Update validate function to include supplier validation
  const validate = () => {
    const newErrors = {};
    if (!formData.fabricId) newErrors.fabricId = "Please select a fabric";
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = "Please enter a valid quantity";
    }
    if (!formData.unitCost || parseFloat(formData.unitCost) <= 0) {
      newErrors.unitCost = "Please enter a valid unit cost";
    }
    if (!formData.invoiceNumber?.trim()) {
      newErrors.invoiceNumber = "Invoice number is required";
    }
    if (!isNewSupplier && !formData.supplierId) {
      newErrors.supplierId = "Please select a supplier";
    }
    if (isNewSupplier) {
      if (!formData.supplierName?.trim()) {
        newErrors.supplierName = "Supplier name is required";
      }
      if (!formData.supplierPhone?.trim()) {
        newErrors.supplierPhone = "Supplier phone is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Find selected supplier if using existing supplier
      const selectedSupplier = !isNewSupplier
        ? suppliers.find((s) => s.id === formData.supplierId)
        : null;

      await onPurchaseStock({
        ...formData,
        // Include supplier name from either selected supplier or new supplier input
        supplierName: !isNewSupplier
          ? selectedSupplier?.name
          : formData.supplierName,
        quantity: parseFloat(formData.quantity),
        unitCost: parseFloat(formData.unitCost),
        totalCost:
          parseFloat(formData.quantity) * parseFloat(formData.unitCost),
        createdAt: new Date().toISOString(),
      });

      // Reset form
      setOpen(false);
      setFormData({
        fabricId: "",
        quantity: "",
        unitCost: "",
        supplierId: "",
        supplierName: "",
        supplierPhone: "",
        invoiceNumber: "",
        purchaseDate: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Purchase Stock</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Purchase Stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Fabric *</label>
            <Select
              value={formData.fabricId}
              onValueChange={(value) =>
                setFormData({ ...formData, fabricId: value })
              }
            >
              <SelectTrigger
                className={errors.fabricId ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select fabric" />
              </SelectTrigger>
              <SelectContent>
                {fabrics.map((fabric) => (
                  <SelectItem key={fabric.id} value={fabric.id}>
                    {fabric.code} - {fabric.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.fabricId && (
              <p className="text-sm text-red-500">{errors.fabricId}</p>
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
              placeholder="Enter invoice number"
            />
            {errors.invoiceNumber && (
              <p className="text-sm text-red-500">{errors.invoiceNumber}</p>
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Supplier Details</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsNewSupplier(!isNewSupplier);
                  setFormData((prev) => ({
                    ...prev,
                    supplierId: "",
                    supplierName: "",
                    supplierPhone: "",
                  }));
                }}
              >
                {isNewSupplier ? "Select Existing" : "Add New"}
              </Button>
            </div>

            {!isNewSupplier ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Supplier *</label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, supplierId: value })
                  }
                >
                  <SelectTrigger
                    className={errors.supplierId ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} - {supplier.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.supplierId && (
                  <p className="text-sm text-red-500">{errors.supplierId}</p>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Supplier Name *</label>
                  <Input
                    value={formData.supplierName}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierName: e.target.value })
                    }
                    className={errors.supplierName ? "border-red-500" : ""}
                    placeholder="Enter supplier name"
                  />
                  {errors.supplierName && (
                    <p className="text-sm text-red-500">
                      {errors.supplierName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number *</label>
                  <Input
                    value={formData.supplierPhone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        supplierPhone: e.target.value,
                      })
                    }
                    className={errors.supplierPhone ? "border-red-500" : ""}
                    placeholder="Enter phone number"
                  />
                  {errors.supplierPhone && (
                    <p className="text-sm text-red-500">
                      {errors.supplierPhone}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                className={errors.quantity ? "border-red-500" : ""}
                placeholder="Enter quantity"
              />
              {errors.quantity && (
                <p className="text-sm text-red-500">{errors.quantity}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Cost *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.unitCost}
                onChange={(e) =>
                  setFormData({ ...formData, unitCost: e.target.value })
                }
                className={errors.unitCost ? "border-red-500" : ""}
                placeholder="Enter unit cost"
              />
              {errors.unitCost && (
                <p className="text-sm text-red-500">{errors.unitCost}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Purchase Date</label>
            <Input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) =>
                setFormData({ ...formData, purchaseDate: e.target.value })
              }
            />
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
            <Button type="submit">Purchase Stock</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

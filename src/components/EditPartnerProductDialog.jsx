"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useData } from "@/contexts/data-context";
import { useToast } from "@/hooks/use-toast";

const METER_TO_YARD = 1.09361;

export function EditPartnerProductDialog({ product, isOpen, onClose, onSave }) {
  const { suppliers } = useData();
  const { toast } = useToast();
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        productName: product.productName || "",
        date: product.date || new Date().toISOString().split("T")[0],
        supplierId: product.supplierId || "",
        quantityMeter: product.quantityMeter?.toString() || "",
        priceDollar: product.priceDollar?.toString() || "",
        dollarRate: product.dollarRate?.toString() || "",
        premiumTaka: product.premiumTaka?.toString() || "",
        otherCostTaka: product.otherCostTaka?.toString() || "",
      });
      setErrors({});
    }
  }, [product, isOpen]);

  const calculations = useMemo(() => {
    const quantity = parseFloat(formData.quantityMeter) || 0;
    const price = parseFloat(formData.priceDollar) || 0;
    const rate = parseFloat(formData.dollarRate) || 0;
    const premium = parseFloat(formData.premiumTaka) || 0;
    const otherCost = parseFloat(formData.otherCostTaka) || 0;

    const totalPriceDollar = quantity * price;
    const totalPriceTaka = totalPriceDollar * rate;
    const totalCostTaka = totalPriceTaka + premium + otherCost;
    const quantityYard = quantity * METER_TO_YARD;
    const pricePerYard = quantityYard > 0 ? totalCostTaka / quantityYard : 0;

    return {
      totalPriceDollar,
      totalPriceTaka,
      totalCostTaka,
      pricePerYard,
      quantityYard,
    };
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.productName?.trim())
      newErrors.productName = "Product Name is required.";
    if (!formData.date) newErrors.date = "Date is required.";
    if (!formData.supplierId) newErrors.supplierId = "Supplier is required.";
    if (!formData.quantityMeter || parseFloat(formData.quantityMeter) <= 0)
      newErrors.quantityMeter = "Valid quantity is required.";
    if (!formData.priceDollar || parseFloat(formData.priceDollar) <= 0)
      newErrors.priceDollar = "Valid price is required.";
    if (!formData.dollarRate || parseFloat(formData.dollarRate) <= 0)
      newErrors.dollarRate = "Valid dollar rate is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please check the form for errors.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const supplier = suppliers.find((s) => s.id === formData.supplierId);
      const updatedData = {
        ...formData,
        supplierName: supplier?.name || product.supplierName || "Unknown",
        quantityMeter: parseFloat(formData.quantityMeter) || 0,
        priceDollar: parseFloat(formData.priceDollar) || 0,
        dollarRate: parseFloat(formData.dollarRate) || 0,
        premiumTaka: parseFloat(formData.premiumTaka) || 0,
        otherCostTaka: parseFloat(formData.otherCostTaka) || 0,
        ...calculations,
      };

      await onSave(product.id, updatedData);
      toast({
        title: "Success",
        description: "Product import updated successfully!",
      });
      onClose();
    } catch (error) {
      console.error("Failed to update product import:", error);
      toast({
        title: "Error",
        description: "Failed to update product import.",
        variant: "destructive",
      });
      setErrors((prev) => ({ ...prev, submit: "Failed to save changes." }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Product Import</DialogTitle>
          <DialogDescription>
            Update the details for "{product?.productName}".
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-productName">Product Name</Label>
              <Input
                id="edit-productName"
                name="productName"
                value={formData.productName || ""}
                onChange={handleChange}
                placeholder="e.g., Cotton Fabric"
                required
                className={errors.productName ? "border-red-500" : ""}
              />
              {errors.productName && (
                <p className="text-sm text-red-500">{errors.productName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                name="date"
                type="date"
                value={formData.date || ""}
                onChange={handleChange}
                required
                className={errors.date ? "border-red-500" : ""}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-supplierId">Supplier Name</Label>
            <Select
              name="supplierId"
              onValueChange={(value) => handleSelectChange("supplierId", value)}
              value={formData.supplierId || ""}
              required
            >
              <SelectTrigger
                id="edit-supplierId"
                className={errors.supplierId ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.supplierId && (
              <p className="text-sm text-red-500">{errors.supplierId}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-quantityMeter">Quantity (meter)</Label>
              <Input
                id="edit-quantityMeter"
                name="quantityMeter"
                type="number"
                value={formData.quantityMeter || ""}
                onChange={handleChange}
                placeholder="e.g., 1000"
                required
                min="0.01"
                step="any"
                className={errors.quantityMeter ? "border-red-500" : ""}
              />
              {errors.quantityMeter && (
                <p className="text-sm text-red-500">{errors.quantityMeter}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-priceDollar">Price ($ per meter)</Label>
              <Input
                id="edit-priceDollar"
                name="priceDollar"
                type="number"
                value={formData.priceDollar || ""}
                onChange={handleChange}
                placeholder="e.g., 2.50"
                required
                min="0.01"
                step="any"
                className={errors.priceDollar ? "border-red-500" : ""}
              />
              {errors.priceDollar && (
                <p className="text-sm text-red-500">{errors.priceDollar}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-dollarRate">Dollar Rate (Taka)</Label>
              <Input
                id="edit-dollarRate"
                name="dollarRate"
                type="number"
                value={formData.dollarRate || ""}
                onChange={handleChange}
                placeholder="e.g., 110.50"
                required
                min="0.01"
                step="any"
                className={errors.dollarRate ? "border-red-500" : ""}
              />
              {errors.dollarRate && (
                <p className="text-sm text-red-500">{errors.dollarRate}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-premiumTaka">Premium (Taka)</Label>
              <Input
                id="edit-premiumTaka"
                name="premiumTaka"
                type="number"
                value={formData.premiumTaka || ""}
                onChange={handleChange}
                placeholder="e.g., 5000"
                min="0"
                step="any"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-otherCostTaka">Other Costs (Taka)</Label>
            <Input
              id="edit-otherCostTaka"
              name="otherCostTaka"
              type="number"
              value={formData.otherCostTaka || ""}
              onChange={handleChange}
              placeholder="e.g., 2500"
              min="0"
              step="any"
            />
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500 mt-2">{errors.submit}</p>
          )}
        </form>
        <DialogFooter className="mt-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

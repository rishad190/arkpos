"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorBoundary } from "@/components/shared/ErrorBoundary";
import { X } from "lucide-react";
import { FABRIC_CONSTANTS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const emptyFabric = {
  name: "",
  code: "",
  category: "COTTON",
  unit: "PIECE",
  description: "",
  lowStockThreshold: 10,
  batches: [],
};

const FabricForm = ({ fabric, onSave, onCancel }) => {
  const [formData, setFormData] = useState(emptyFabric);

  useEffect(() => {
    if (fabric) {
      // Ensure batches is always an array (convert from Firebase object if needed)
      const batches = Array.isArray(fabric.batches)
        ? fabric.batches
        : fabric.batches
          ? Object.entries(fabric.batches).map(([id, batch]) => {
              // Also ensure batch.items is an array
              const items = Array.isArray(batch.items)
                ? batch.items
                : batch.items
                  ? Object.values(batch.items)
                  : [];
              
              return {
                ...batch,
                id,
                items,
              };
            })
          : [];
      
      setFormData({
        ...fabric,
        batches,
        // Ensure required fields have values (check for empty strings too)
        category: fabric.category && fabric.category.trim() !== '' ? fabric.category : emptyFabric.category,
        unit: fabric.unit && fabric.unit.trim() !== '' ? fabric.unit : emptyFabric.unit,
      });
    } else {
      setFormData(emptyFabric);
    }
  }, [fabric]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "lowStockThreshold" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBatchChange = (batchIndex, e) => {
    const { name, value } = e.target;
    const newBatches = [...formData.batches];
    newBatches[batchIndex] = {
      ...newBatches[batchIndex],
      [name]: name === "costPerPiece" ? parseFloat(value) || 0 : value,
    };
    setFormData((prev) => ({ ...prev, batches: newBatches }));
  };

  const handleAddBatch = () => {
    const newBatch = {
      id: `b${Date.now()}`,
      containerNo: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      costPerPiece: 0,
      items: [],
    };
    setFormData((prev) => ({ ...prev, batches: [...prev.batches, newBatch] }));
  };

  const handleRemoveBatch = (batchIndex) => {
    setFormData((prev) => ({
      ...prev,
      batches: prev.batches.filter((_, i) => i !== batchIndex),
    }));
  };

  const handleColorChange = (batchIndex, itemIndex, e) => {
    const { name, value } = e.target;
    const newBatches = [...formData.batches];
    newBatches[batchIndex].items[itemIndex] = {
      ...newBatches[batchIndex].items[itemIndex],
      [name]: name === "quantity" ? parseFloat(value) || 0 : value,
    };
    setFormData((prev) => ({ ...prev, batches: newBatches }));
  };

  const handleAddColor = (batchIndex) => {
    const newColor = { colorName: "", quantity: 0 };
    const newBatches = [...formData.batches];
    newBatches[batchIndex].items.push(newColor);
    setFormData((prev) => ({ ...prev, batches: newBatches }));
  };

  const handleRemoveColor = (batchIndex, itemIndex) => {
    const newBatches = [...formData.batches];
    newBatches[batchIndex].items = newBatches[batchIndex].items.filter(
      (_, i) => i !== itemIndex
    );
    setFormData((prev) => ({ ...prev, batches: newBatches }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, id: fabric?.id || "" });
  };

  return (
    <FormErrorBoundary>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
      >
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            Fabric Name
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="code" className="text-sm font-medium">
              Code
            </Label>
            <Input
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="category" className="text-sm font-medium">
              Category
            </Label>
            <Select
              name="category"
              value={formData.category}
              onValueChange={(value) => handleSelectChange("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {FABRIC_CONSTANTS.CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="mt-1 h-20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="unit" className="text-sm font-medium">
              Unit
            </Label>
            <Select
              name="unit"
              value={formData.unit}
              onValueChange={(value) => handleSelectChange("unit", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent>
                {FABRIC_CONSTANTS.UNITS.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="lowStockThreshold" className="text-sm font-medium">
              Low Stock Threshold
            </Label>
            <Input
              id="lowStockThreshold"
              type="number"
              name="lowStockThreshold"
              value={formData.lowStockThreshold}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold border-t pt-4 mt-4">
            Containers / Batches
          </h4>
          {formData.batches.map((batch, batchIndex) => (
            <div
              key={batch.id || batchIndex}
              className="p-4 border rounded-md space-y-3 bg-secondary/50"
            >
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium">Container No.</Label>
                  <Input
                    name="containerNo"
                    value={batch.containerNo}
                    onChange={(e) => handleBatchChange(batchIndex, e)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Purchase Date</Label>
                  <Input
                    type="date"
                    name="purchaseDate"
                    value={batch.purchaseDate}
                    onChange={(e) => handleBatchChange(batchIndex, e)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Cost/piece</Label>
                  <Input
                    type="number"
                    name="costPerPiece"
                    value={batch.costPerPiece}
                    onChange={(e) => handleBatchChange(batchIndex, e)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-medium">Colors & Quantities</h5>
                {batch.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center gap-2">
                    <Input
                      placeholder="Color Name"
                      name="colorName"
                      value={item.colorName}
                      onChange={(e) =>
                        handleColorChange(batchIndex, itemIndex, e)
                      }
                    />
                    <Input
                      placeholder="Quantity"
                      type="number"
                      name="quantity"
                      value={item.quantity}
                      onChange={(e) =>
                        handleColorChange(batchIndex, itemIndex, e)
                      }
                      className="w-28"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveColor(batchIndex, itemIndex)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddColor(batchIndex)}
                >
                  Add Color
                </Button>
              </div>

              <Button
                type="button"
                variant="destructive"
                onClick={() => handleRemoveBatch(batchIndex)}
              >
                Remove Container
              </Button>
            </div>
          ))}

          <Button type="button" onClick={handleAddBatch} variant="outline">
            Add Container
          </Button>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{fabric ? "Update" : "Save"} Fabric</Button>
        </div>
      </form>
    </FormErrorBoundary>
  );
};

export default FabricForm;
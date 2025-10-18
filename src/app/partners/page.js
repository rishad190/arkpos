"use client";
import { useState, useMemo } from "react";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { useToast } from "@/hooks/use-toast";

// Conversion factor
const METER_TO_YARD = 1.09361;

export default function PartnerPage() {
  const { suppliers, addPartnerProduct, partnerProducts } = useData();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    productName: "",
    date: new Date().toISOString().split("T")[0],
    supplierId: "",
    quantityMeter: "",
    priceDollar: "",
    dollarRate: "",
    premiumTaka: "",
    otherCostTaka: "",
  });

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
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (
        !formData.productName ||
        !formData.supplierId ||
        !formData.quantityMeter ||
        !formData.priceDollar ||
        !formData.dollarRate
      ) {
        toast({
          title: "Error",
          description: "Please fill all required fields.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const supplier = suppliers.find((s) => s.id === formData.supplierId);

      const productImportData = {
        ...formData,
        supplierName: supplier?.name || "Unknown",
        ...calculations,
        createdAt: new Date().toISOString(),
      };

      await addPartnerProduct(productImportData);

      toast({
        title: "Success",
        description: "Product import added successfully!",
      });

      // Reset form
      setFormData({
        productName: "",
        date: new Date().toISOString().split("T")[0],
        supplierId: "",
        quantityMeter: "",
        priceDollar: "",
        dollarRate: "",
        premiumTaka: "",
        otherCostTaka: "",
      });
    } catch (error) {
      console.error("Failed to save product import:", error);
      toast({
        title: "Error",
        description: "Failed to save product import.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Partner Imports"
        description="Calculate and manage product import costs with partners."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Add Product Import</CardTitle>
              <CardDescription>
                Fill in the details below to calculate the landed cost per yard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      name="productName"
                      value={formData.productName}
                      onChange={handleChange}
                      placeholder="e.g., Cotton Fabric"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplierId">Supplier Name</Label>
                  <Select
                    name="supplierId"
                    onValueChange={(value) =>
                      handleSelectChange("supplierId", value)
                    }
                    value={formData.supplierId}
                    required
                  >
                    <SelectTrigger>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="quantityMeter">
                      Product Quantity (meter)
                    </Label>
                    <Input
                      id="quantityMeter"
                      name="quantityMeter"
                      type="number"
                      value={formData.quantityMeter}
                      onChange={handleChange}
                      placeholder="e.g., 1000"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceDollar">
                      Product Price ($ per meter)
                    </Label>
                    <Input
                      id="priceDollar"
                      name="priceDollar"
                      type="number"
                      value={formData.priceDollar}
                      onChange={handleChange}
                      placeholder="e.g., 2.50"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dollarRate">Dollar Price (Taka)</Label>
                    <Input
                      id="dollarRate"
                      name="dollarRate"
                      type="number"
                      value={formData.dollarRate}
                      onChange={handleChange}
                      placeholder="e.g., 110.50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="premiumTaka">Premium (Taka)</Label>
                    <Input
                      id="premiumTaka"
                      name="premiumTaka"
                      type="number"
                      value={formData.premiumTaka}
                      onChange={handleChange}
                      placeholder="e.g., 5000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherCostTaka">Other Costs (Taka)</Label>
                  <Input
                    id="otherCostTaka"
                    name="otherCostTaka"
                    type="number"
                    value={formData.otherCostTaka}
                    onChange={handleChange}
                    placeholder="e.g., 2500"
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Product Import"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Calculation Summary Section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Cost Calculation</CardTitle>
              <CardDescription>
                Live cost breakdown based on your input.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-muted-foreground">
                  Total Price ($)
                </span>
                <span className="font-semibold text-lg">
                  $
                  {calculations.totalPriceDollar.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-muted-foreground">
                  Total Price (Taka)
                </span>
                <span className="font-semibold text-lg">
                  ৳
                  {calculations.totalPriceTaka.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-muted-foreground">
                  Total Cost (Taka)
                </span>
                <span className="font-semibold text-lg">
                  ৳
                  {calculations.totalCostTaka.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-muted-foreground">
                  Quantity (yard)
                </span>
                <span className="font-semibold text-lg">
                  {calculations.quantityYard.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 bg-muted p-3 rounded-lg">
                <span className="font-semibold">Price per Yard (Taka)</span>
                <span className="font-bold text-xl text-primary">
                  ৳
                  {calculations.pricePerYard.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Display Area */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Imported Products</h2>
        {partnerProducts && partnerProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnerProducts.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="text-base">{p.productName}</CardTitle>
                  <CardDescription className="text-sm">
                    {p.supplierName} •{" "}
                    {new Date(p.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Quantity (m)
                      </span>
                      <span className="font-medium">
                        {Number(p.quantityMeter).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total (USD)
                      </span>
                      <span className="font-medium">
                        ${Number(p.totalPriceDollar || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total (Taka)
                      </span>
                      <span className="font-medium">
                        ৳{Number(p.totalPriceTaka || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Price / Yard (Taka)
                      </span>
                      <span className="font-medium">
                        ৳{Number(p.pricePerYard || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Saved product imports will appear here.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

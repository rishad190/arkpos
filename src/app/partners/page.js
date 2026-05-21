"use client";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useInventory } from "@/contexts/inventory-context";
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
import { PageHeader } from "@/components/shared/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, MoreVertical, HelpCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditPartnerProductDialog } from "@/components/inventory/EditPartnerProductDialog";

// Conversion factor
const METER_TO_YARD = 1.09361;

export default function PartnerPage() {
  const router = useRouter();
  const {
    suppliers,
    addPartnerProduct,
    partnerProducts,
    deletePartnerProduct,
    updatePartnerProduct,
  } = useInventory();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

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

  const handleDelete = async (productId) => {
    try {
      await deletePartnerProduct(productId);
      toast({
        title: "Success",
        description: "Product import deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete product import:", error);
      toast({
        title: "Error",
        description: "Failed to delete product import.",
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
  };

  const handleUpdate = useCallback(
    async (productId, updatedData) => {
      setIsSaving(true);
      try {
        await updatePartnerProduct(productId, updatedData);
        toast({
          title: "Success",
          description: "Product import updated successfully!",
        });
        setEditingProduct(null);
      } catch (error) {
        console.error("Failed to update product import:", error);
        toast({
          title: "Error",
          description: "Failed to update product import.",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [updatePartnerProduct, toast]
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Partner Imports"
        description="Calculate and manage product import costs with partners."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="quantityMeter">Product Quantity (meter)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The total length of fabric in meters as imported.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="priceDollar">Product Price ($ per meter)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>FOB (Free on Board) purchase price per meter in USD.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="dollarRate">Dollar Price (Taka)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The exchange rate for 1 USD to Bangladeshi Taka (BDT) at the time of purchase.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="premiumTaka">Premium (Taka)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Premium, customs clearance, or duty fees paid in Taka (BDT).</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
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
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="otherCostTaka">Other Costs (Taka)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Additional overhead costs (shipping, local transport, labor) in Taka (BDT).</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
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
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  Total Price ($)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Formula: Quantity (m) × Price ($/m). Base invoice cost in USD.</p>
                    </TooltipContent>
                  </Tooltip>
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
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  Total Price (Taka)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Formula: Total Price ($) × Exchange Rate (BDT). Base invoice cost in Taka.</p>
                    </TooltipContent>
                  </Tooltip>
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
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  Total Cost (Taka)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Formula: Total Price (Taka) + Premium + Other Costs. Total capital required for this import.</p>
                    </TooltipContent>
                  </Tooltip>
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
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  Quantity (yard)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Formula: Quantity (m) × 1.09361. Converts meters to standard sales units (yards).</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="font-semibold text-lg">
                  {calculations.quantityYard.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 bg-muted p-3 rounded-lg">
                <span className="font-semibold flex items-center gap-1.5">
                  Price per Yard (Taka)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Formula: Total Cost (Taka) ÷ Quantity (yd). Landed cost per yard (used for FIFO valuation and sales margins).</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
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

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Imported Products</h2>
        {partnerProducts && partnerProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnerProducts.map((p) => (
              <Card
                key={p.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div
                      className="flex-grow cursor-pointer"
                      onClick={() => router.push(`/partners/${p.id}`)}
                    >
                      <CardTitle className="text-base">
                        {p.productName}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {p.supplierName} •{" "}
                        {new Date(p.createdAt || p.date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => handleEdit(p)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500"
                          onSelect={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <div className="cursor-pointer" onClick={() => router.push(`/partners/${p.id}`)}>
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
                </div>
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              imported product record for `{deleteTarget?.productName}`.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget.id);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingProduct && (
        <EditPartnerProductDialog
          product={editingProduct}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={handleUpdate}
        />
      )}
      </div>
    </TooltipProvider>
  );
}

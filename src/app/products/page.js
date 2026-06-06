"use client";
import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProducts } from "@/contexts/product-context";
import { useInventory } from "@/contexts/inventory-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, TrendingUp, TrendingDown, Package, MoreHorizontal, Search, ArrowLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateTotalQuantity } from "@/lib/inventory-utils";
import { useToast } from "@/hooks/use-toast";
import dynamic from "next/dynamic";

const FabricForm = dynamic(() => import("@/components/inventory/FabricForm.jsx"), {
  loading: () => (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="mt-2 text-sm text-muted-foreground">Loading form...</p>
    </div>
  ),
  ssr: false,
});

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // Tab handling
  const defaultTab = searchParams.get("tab") || "products";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Products state
  const { products, loading: productsLoading, totals, deleteProduct } = useProducts();
  const [deletingId, setDeletingId] = useState(null);

  // Fabric Inventory state
  const {
    fabrics,
    addFabric,
    updateFabric,
    deleteFabric,
    addFabricBatch,
    updateFabricBatch,
  } = useInventory();
  
  const [fabricSearchTerm, setFabricSearchTerm] = useState("");
  const [isFabricDialogOpen, setIsFabricDialogOpen] = useState(false);
  const [editingFabric, setEditingFabric] = useState(null);
  const [viewingFabric, setViewingFabric] = useState(null);

  const handleDeleteProduct = async () => {
    if (!deletingId) return;
    try {
      await deleteProduct(deletingId);
      setDeletingId(null);
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
    }
  };

  // Filter fabrics
  const filteredFabrics = useMemo(() => {
    if (!Array.isArray(fabrics)) return [];
    return fabrics.filter((fabric) => {
      if (!fabric) return false;
      const searchString = fabricSearchTerm.toLowerCase();
      return (
        fabric.name?.toLowerCase().includes(searchString) ||
        fabric.code?.toLowerCase().includes(searchString) ||
        fabric.category?.toLowerCase().includes(searchString)
      );
    });
  }, [fabrics, fabricSearchTerm]);

  const handleAddFabricClick = () => {
    setEditingFabric(null);
    setIsFabricDialogOpen(true);
  };

  const handleEditFabricClick = (fabric) => {
    setEditingFabric(fabric);
    setIsFabricDialogOpen(true);
  };

  const handleDeleteFabricClick = async (fabricId) => {
    if (window.confirm("Are you sure you want to delete this fabric?")) {
      try {
        await deleteFabric(fabricId);
        toast({
          title: "Success",
          description: "Fabric deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting fabric:", error);
        toast({
          title: "Error",
          description: "Failed to delete fabric. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveFabric = async (fabric) => {
    try {
      const { batches, ...fabricData } = fabric;

      if (fabric.id) {
        // Update existing fabric
        await updateFabric(fabric.id, {
          ...fabricData,
          updatedAt: new Date().toISOString(),
        });

        // Update batches
        if (batches && batches.length > 0) {
          for (const batch of batches) {
            if (batch.id && batch.id.startsWith("b")) {
              const { id, ...batchData } = batch;
              await addFabricBatch({
                ...batchData,
                fabricId: fabric.id,
                createdAt: new Date().toISOString(),
              });
            } else {
              await updateFabricBatch(batch.id, {
                ...batch,
                fabricId: fabric.id,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }

        toast({
          title: "Success",
          description: "Fabric updated successfully",
        });
      } else {
        // Add new fabric
        const fabricId = await addFabric({
          ...fabricData,
          createdAt: new Date().toISOString(),
        });

        // Add batches
        if (batches && batches.length > 0) {
          for (const batch of batches) {
            const { id, ...batchData } = batch;
            await addFabricBatch({
              ...batchData,
              fabricId: fabricId,
              createdAt: new Date().toISOString(),
            });
          }
        }

        toast({
          title: "Success",
          description: "Fabric added successfully",
        });
      }
      setIsFabricDialogOpen(false);
      setEditingFabric(null);
    } catch (error) {
      console.error("Error saving fabric:", error);
      toast({
        title: "Error",
        description: "Failed to save fabric. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6 flex flex-col lg:h-[calc(100vh-64px)] lg:overflow-hidden">
      <div className="flex-none">
        <PageHeader
          title={activeTab === "products" ? "Product Ledger" : "Fabric Inventory"}
          description={
            activeTab === "products"
              ? "Track investments, cashflow, and ROI per product or project."
              : "Manage your fabric stocks, containers, and color quantities."
          }
          actions={
            activeTab === "products" ? (
              <AddProductDialog>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Add Product
                </Button>
              </AddProductDialog>
            ) : (
              <Button onClick={handleAddFabricClick}>
                <Plus className="h-4 w-4 mr-2" /> Add Fabric
              </Button>
            )
          }
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 space-y-4">
        <TabsList className="grid grid-cols-2 max-w-md flex-none">
          <TabsTrigger value="products">Product Ledgers</TabsTrigger>
          <TabsTrigger value="inventory">Fabric Inventory</TabsTrigger>
        </TabsList>

        {/* Tab content: Products */}
        <TabsContent value="products" className="flex-1 flex flex-col min-h-0 space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-none">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.totalCost)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total product & operational costs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Partner Capital
                </CardTitle>
                <Package className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.totalPartnerInvestment)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total investments from partners</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sales
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.totalSales)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total revenue from products</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.totalNetProfit > 0 ? "+" : ""}{formatCurrency(totals.totalNetProfit)}</div>
                <p className="text-xs text-muted-foreground mt-1">Global Profit/Loss on goods</p>
              </CardContent>
            </Card>
          </div>

          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-none pb-4 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Active Products</CardTitle>
                  <CardDescription>Click on a product to view its detailed ledger</CardDescription>
                </div>
                <AddProductDialog>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Add Product
                  </Button>
                </AddProductDialog>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Total Expenses</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Partners</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24">
                        <div className="flex items-center justify-center h-full">
                          <Skeleton className="h-8 w-[250px]" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-[200px] text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Package className="h-10 w-10 mb-4 opacity-50" />
                          <p>No products tracked yet.</p>
                          <AddProductDialog>
                            <Button variant="link" className="mt-2 text-primary">
                              Add your first product to track
                            </Button>
                          </AddProductDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow 
                         key={product.id} 
                         className="cursor-pointer hover:bg-muted/50"
                         onClick={() => router.push(`/products/${product.id}`)}
                      >
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-medium">{formatDate(product.startDate)}</span>
                                 <span className="text-xs text-muted-foreground">{product.daysElapsed} days</span>
                            </div>
                        </TableCell>
                        <TableCell className="font-medium">
                            {product.name}
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                {product.quantity && <span className="font-semibold text-primary/80 bg-primary/5 px-1 rounded">Qty: {product.quantity}</span>}
                                {product.color && <span className="font-semibold text-primary/80 bg-primary/5 px-1 rounded">Color: {product.color}</span>}
                                {product.details && <span className="text-muted-foreground">{product.details}</span>}
                                {product.notes && <span className="max-w-[150px] truncate italic">{product.notes}</span>}
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                            {formatCurrency(product.totalCost)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(product.totalSales)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-500">
                            {formatCurrency(product.totalPartnerInvestment)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={product.netProfit >= 0 ? "default" : "destructive"} className={product.netProfit >= 0 ? "bg-green-600 font-bold" : "font-bold"}>
                            {product.netProfit >= 0 ? 'PROFIT' : 'LOSS'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-bold ${product.netProfit < 0 ? 'text-destructive' : 'text-primary'}`}>
                            {product.netProfit > 0 ? '+' : ''}{formatCurrency(product.netProfit)}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <AlertDialog open={deletingId === product.id} onOpenChange={(open) => !open && setDeletingId(null)}>
                                    <AlertDialogTrigger asChild>
                                      <div 
                                        className="flex w-full cursor-pointer items-center text-sm text-destructive hover:text-destructive focus:text-destructive"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setDeletingId(product.id);
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent onClick={e => e.stopPropagation()}>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Product Ledger?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete this product and all of its associated transactions. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeleteProduct(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab content: Fabric Inventory */}
        <TabsContent value="inventory" className="flex-1 flex flex-col min-h-0 space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-none pb-4 border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, code, or category..."
                    value={fabricSearchTerm}
                    onChange={(e) => setFabricSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleAddFabricClick} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" /> Add New Fabric
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <Table className="min-w-[700px]">
                <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFabrics.map((fabric) => (
                    <TableRow
                      key={fabric.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => setViewingFabric(fabric)}
                    >
                      <TableCell className="font-medium">
                        <div>{fabric.name}</div>
                        {fabric.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {fabric.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{fabric.code || "-"}</TableCell>
                      <TableCell>{fabric.category || "-"}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {calculateTotalQuantity(fabric).toFixed(2)} {fabric.unit || "pieces"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingFabric(fabric)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditFabricClick(fabric)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteFabricClick(fabric.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!filteredFabrics.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No fabrics found. {fabricSearchTerm && "Try adjusting your search terms."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fabric Form Dialog */}
      <Dialog open={isFabricDialogOpen} onOpenChange={setIsFabricDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFabric ? "Edit Fabric" : "Add New Fabric"}
            </DialogTitle>
          </DialogHeader>
          <FabricForm
            fabric={editingFabric}
            onSave={handleSaveFabric}
            onCancel={() => {
              setIsFabricDialogOpen(false);
              setEditingFabric(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Fabric Details Dialog */}
      <Dialog open={!!viewingFabric} onOpenChange={(open) => !open && setViewingFabric(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-md">
          {viewingFabric && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                  <span>{viewingFabric.name}</span>
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({viewingFabric.code || "No Code"})
                  </span>
                </DialogTitle>
                <DialogDescription>
                  Category: {viewingFabric.category || "Uncategorized"} {viewingFabric.description ? `• ${viewingFabric.description}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <Card className="bg-primary/5 border border-primary/20">
                  <CardContent className="p-4">
                    <div className="text-3xl font-black text-primary">
                      {calculateTotalQuantity(viewingFabric).toFixed(2)}
                      <span className="text-lg font-medium text-muted-foreground ml-2">
                        {viewingFabric.unit || "pieces"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total available stock across all containers.
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h4 className="text-lg font-bold">Container Details</h4>
                  {(() => {
                    const batches = Array.isArray(viewingFabric.batches)
                      ? viewingFabric.batches
                      : viewingFabric.batches
                      ? Object.entries(viewingFabric.batches).map(([id, val]) => ({ ...val, id }))
                      : [];

                    if (batches.length === 0) {
                      return (
                        <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                          No containers or batches have been added for this fabric yet.
                        </div>
                      );
                    }

                    return batches.map((batch) => {
                      const items = Array.isArray(batch.items)
                        ? batch.items
                        : batch.items
                        ? Object.values(batch.items)
                        : [];

                      const batchTotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

                      return (
                        <Card key={batch.id} className="border border-border/40">
                          <CardHeader className="pb-2 flex flex-row justify-between items-center">
                            <div>
                              <CardTitle className="text-base font-semibold">
                                Container: {batch.containerNo || "N/A"}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                Purchased: {batch.purchaseDate ? formatDate(batch.purchaseDate) : "N/A"}
                                {batch.costPerPiece ? ` • Cost: ৳${Number(batch.costPerPiece).toFixed(2)} / piece` : ""}
                              </CardDescription>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-sm">
                                {batchTotal.toFixed(2)} {viewingFabric.unit || "pieces"}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-2">
                            {items.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="py-1 h-auto text-xs">Color</TableHead>
                                    <TableHead className="py-1 h-auto text-right text-xs">Quantity</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map((item, idx) => (
                                    <TableRow key={idx} className="hover:bg-transparent">
                                      <TableCell className="py-1.5 text-xs font-medium">{item.colorName || "No Color"}</TableCell>
                                      <TableCell className="py-1.5 text-right text-xs">{Number(item.quantity).toFixed(2)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-2">No color items in this container.</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}

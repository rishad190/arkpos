// app/inventory/[id]/page.tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/app/data-context";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SellFabricDialog } from "@/components/SellFabricDialog";
import { PurchaseStockDialog } from "@/components/PurchaseStockDialog";
import { EditFabricDialog } from "@/components/EditFabricDialog";
import {
  calculateWeightedAverage,
  calculateFifoSale,
} from "@/lib/inventory-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditBatchDialog } from "@/components/EditBatchDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Package,
  DollarSign,
  Scale,
  RefreshCw,
  TrendingUp,
  History,
  Trash2,
  Edit,
  Printer,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function FabricViewPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const {
    fabrics,
    fabricBatches,
    transactions,
    addFabricBatch,
    updateFabricBatch,
    deleteFabricBatch,
    addTransaction,
    suppliers,
    updateFabric,
    deleteFabric,
  } = useData();

  const [viewMode, setViewMode] = useState("table");
  const [loadingState, setLoadingState] = useState({
    initial: true,
    actions: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Initialize loading state
  useEffect(() => {
    if (fabrics !== undefined && fabricBatches !== undefined) {
      setLoadingState((prev) => ({ ...prev, initial: false }));
    }
  }, [fabrics, fabricBatches]);

  const fabric = fabrics?.find((f) => f.id === id);

  // Get filtered batches and transactions for this fabric
  const batches = useMemo(
    () => fabricBatches?.filter((b) => b.fabricId === id) || [],
    [fabricBatches, id]
  );

  const fabricTransactions = useMemo(
    () => transactions?.filter((t) => t.fabricId === id) || [],
    [transactions, id]
  );

  // Memoize calculations
  const {
    totalQuantity,
    averageCost,
    currentValue,
    priceHistory,
    recentTransactions,
  } = useMemo(() => {
    if (!fabric || !batches) return {};

    const totalQty = batches.reduce((sum, b) => sum + b.quantity, 0);
    const avgCost = calculateWeightedAverage(batches);
    const currentVal = totalQty * avgCost;

    const history = batches
      .map((b) => ({
        id: b.id, // Add the batch ID
        date: new Date(b.createdAt).toLocaleDateString(),
        price: b.unitCost,
        quantity: b.quantity,
        supplierName: b.supplierName,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const recent = fabricTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return {
      totalQuantity: totalQty,
      averageCost: avgCost,
      currentValue: currentVal,
      priceHistory: history,
      recentTransactions: recent,
    };
  }, [fabric, batches, fabricTransactions]);

  const handleSellFabric = async (quantity) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      if (!fabric) throw new Error("Fabric not found");

      const result = calculateFifoSale(batches, quantity);

      for (const batch of result.updatedBatches) {
        if (batch.quantity > 0) {
          await updateFabricBatch(batch.id, { quantity: batch.quantity });
        } else {
          await deleteFabricBatch(batch.id);
        }
      }

      const saleTransaction = {
        fabricId: id,
        quantity,
        totalCost: result.totalCost,
        date: new Date().toISOString(),
        type: "FABRIC_SALE",
        batches: result.costOfGoodsSold,
      };
      await addTransaction(saleTransaction);
      toast({
        title: "Success",
        description: "Fabric sold successfully",
      });
    } catch (error) {
      console.error("Error selling fabric:", error);
      toast({
        title: "Error",
        description: "Failed to sell fabric. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleEditBatch = async (batchId, updates) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await updateFabricBatch(batchId, updates);
      toast({
        title: "Success",
        description: "Batch updated successfully",
      });
    } catch (error) {
      console.error("Error updating batch:", error);
      toast({
        title: "Error",
        description: "Failed to update batch. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleDeleteBatch = async (batchId) => {
    setBatchToDelete(batchId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!batchToDelete) return;

    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await deleteFabricBatch(batchToDelete);
      toast({
        title: "Success",
        description: "Batch deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting batch:", error);
      toast({
        title: "Error",
        description: "Failed to delete batch. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
      setDeleteDialogOpen(false);
      setBatchToDelete(null);
    }
  };

  const handlePurchaseStock = async (purchaseData) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await addFabricBatch({
        ...purchaseData,
        fabricId: id,
        createdAt: new Date().toISOString(),
      });
      toast({
        title: "Success",
        description: "Stock purchased successfully",
      });
    } catch (error) {
      console.error("Error purchasing stock:", error);
      toast({
        title: "Error",
        description: "Failed to purchase stock. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleEditFabric = async (updates) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await updateFabric(updates);
      toast({
        title: "Success",
        description: "Fabric updated successfully",
      });
    } catch (error) {
      console.error("Error updating fabric:", error);
      toast({
        title: "Error",
        description: "Failed to update fabric. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleDeleteFabric = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this fabric? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await deleteFabric(id);
      toast({
        title: "Success",
        description: "Fabric deleted successfully",
      });
      router.push("/inventory");
    } catch (error) {
      console.error("Error deleting fabric:", error);
      toast({
        title: "Error",
        description: "Failed to delete fabric. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  // Add this new function for printing
  const handlePrint = () => {
    setIsPrinting(true);
    const printWindow = window.open("", "_blank");
    const content = document.getElementById("printable-content");

    if (printWindow && content) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Fabric Details - ${fabric.name}</title>
            <style>
              body { font-family: Arial, sans-serif; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .summary { margin-bottom: 20px; }
              .summary-item { margin: 10px 0; }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>Fabric Details - ${fabric.name}</h1>
            <div class="summary">
              <div class="summary-item">Code: ${fabric.code}</div>
              <div class="summary-item">Category: ${fabric.category}</div>
              <div class="summary-item">Unit: ${fabric.unit}</div>
              <div class="summary-item">Total Quantity: ${totalQuantity.toFixed(
                2
              )} ${fabric.unit}</div>
              <div class="summary-item">Average Cost: ৳${averageCost.toFixed(
                2
              )}</div>
              <div class="summary-item">Current Value: ৳${currentValue.toFixed(
                2
              )}</div>
            </div>
            ${content.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      setIsPrinting(false);
    }
  };

  // Loading skeleton components
  const SummaryCardSkeleton = () => (
    <Card className="overflow-hidden border-none shadow-md">
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
        <div className="p-4">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );

  const TableSkeleton = () => (
    <Card className="border-none shadow-md">
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Move DeleteConfirmationDialog inside the main component
  const DeleteConfirmationDialog = () => (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Batch</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this batch? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (loadingState.initial) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>

        {/* Tables */}
        <TableSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (!fabric) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Fabric Not Found</h2>
          <p className="mt-2 text-gray-600">
            The fabric you're looking for doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => router.push("/inventory")}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button
            variant="outline"
            onClick={() => router.push("/inventory")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{fabric.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{fabric.code}</Badge>
            <Badge variant="secondary">{fabric.category}</Badge>
            <Badge variant="secondary">{fabric.unit}</Badge>
          </div>
          {fabric.description && (
            <p className="text-muted-foreground mt-2">{fabric.description}</p>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
          <EditFabricDialog
            fabric={fabric}
            onSave={handleEditFabric}
            onDelete={handleDeleteFabric}
          >
            <Button
              variant="outline"
              className="w-full md:w-auto"
              disabled={loadingState.actions}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Fabric
            </Button>
          </EditFabricDialog>
          <PurchaseStockDialog
            fabrics={[fabric]}
            suppliers={suppliers}
            onPurchaseStock={handlePurchaseStock}
          >
            <Button
              className="w-full md:w-auto"
              disabled={loadingState.actions}
            >
              <Package className="mr-2 h-4 w-4" />
              Purchase Stock
            </Button>
          </PurchaseStockDialog>
          <Button
            onClick={handlePrint}
            className="w-full md:w-auto"
            variant="outline"
            disabled={loadingState.actions || isPrinting}
          >
            <Printer className="mr-2 h-4 w-4" />
            {isPrinting ? "Printing..." : "Print Report"}
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="overflow-hidden border-none shadow-md">
          <CardContent className="p-0">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border-b border-blue-100 dark:border-blue-800">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Total Quantity
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Current stock quantity</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                {totalQuantity.toFixed(2)} {fabric.unit}
              </p>
              <div className="mt-2">
                <Progress value={100} className="h-2 bg-blue-100" />
              </div>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                Current stock quantity
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <CardContent className="p-0">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 border-b border-green-100 dark:border-green-800">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                  Average Cost
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Average cost per unit</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                ৳{averageCost.toFixed(2)}
              </p>
              <div className="mt-2">
                <Progress value={100} className="h-2 bg-green-100" />
              </div>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                Average cost per unit
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <CardContent className="p-0">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 border-b border-purple-100 dark:border-purple-800">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300">
                  Current Value
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <RefreshCw className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total inventory value</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
                ৳{currentValue.toFixed(2)}
              </p>
              <div className="mt-2">
                <Progress value={100} className="h-2 bg-purple-100" />
              </div>
              <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
                Total inventory value
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price History Section */}
      <Card className="border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Price History</h2>
            </div>
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="View Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chart">Chart View</SelectItem>
                <SelectItem value="table">Table View</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {viewMode === "chart" ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Chart view coming soon...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Purchase Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceHistory.map((batch, index) => (
                  <TableRow key={batch.id || `price-history-${index}`}>
                    <TableCell>{batch.date}</TableCell>
                    <TableCell>৳{batch.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {batch.quantity} {fabric.unit}
                    </TableCell>
                    <TableCell>{batch.supplierName}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <EditBatchDialog
                          batch={batch}
                          fabric={fabric}
                          onSave={handleEditBatch}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteBatch(batch.id)}
                          disabled={loadingState.actions}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!priceHistory.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No price history available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions Section */}
      <Card className="border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Recent Stock Movements</h2>
          </div>{" "}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.type === "FABRIC_SALE"
                          ? "destructive"
                          : "default"
                      }
                    >
                      {transaction.type === "FABRIC_SALE" ? "Sale" : "Purchase"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.quantity} {fabric.unit}
                  </TableCell>
                  <TableCell>৳{transaction.unitPrice?.toFixed(2)}</TableCell>
                  <TableCell>৳{transaction.totalValue?.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {!recentTransactions.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No recent transactions
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sell Fabric Section */}
      <Card className="border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">Sell Stock</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Sell fabric from your current stock
              </p>
            </div>
            <SellFabricDialog
              fabric={{ ...fabric, batches, totalQuantity }}
              onSellFabric={handleSellFabric}
            >
              <Button
                className="w-full md:w-auto"
                disabled={loadingState.actions || totalQuantity <= 0}
              >
                Sell Stock
              </Button>
            </SellFabricDialog>
          </div>
        </CardContent>
      </Card>

      {/* Add the Delete Confirmation Dialog */}
      <DeleteConfirmationDialog />

      {/* Add the printable content div */}
      <div id="printable-content" className="hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Supplier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceHistory.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell>{batch.date}</TableCell>
                <TableCell>৳{batch.price.toFixed(2)}</TableCell>
                <TableCell>
                  {batch.quantity} {fabric.unit}
                </TableCell>
                <TableCell>{batch.supplierName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

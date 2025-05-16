"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/app/data-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { calculateWeightedAverage } from "@/lib/inventory-utils";
import { SellFabricDialog } from "@/components/SellFabricDialog";
import { calculateFifoSale } from "@/lib/inventory-utils";
import { AddFabricDialog } from "@/components/AddFabricDialog";
import { PurchaseStockDialog } from "@/components/PurchaseStockDialog";
import { EditFabricDialog } from "@/components/EditFabricDialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToPDF } from "@/lib/utils";
import {
  Search,
  Plus,
  Download,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Package,
  DollarSign,
  Scale,
  Trash2,
} from "lucide-react";

export default function InventoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    fabrics,
    fabricBatches,
    addFabric,
    updateFabric,
    deleteFabric,
    addFabricBatch,
    updateFabricBatch,
    deleteFabricBatch,
    addTransaction,
    suppliers,
  } = useData();
  const [viewMode, setViewMode] = useState("average");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingState, setLoadingState] = useState({
    initial: true,
    actions: false,
  });

  // Initialize loading state
  useEffect(() => {
    if (fabrics !== undefined) {
      setLoadingState((prev) => ({ ...prev, initial: false }));
    }
  }, [fabrics]);

  // Memoize filtered fabrics and calculations
  const { filteredFabrics, totals } = useMemo(() => {
    const filtered =
      fabrics?.filter(
        (fabric) =>
          fabric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          fabric.code.toLowerCase().includes(searchTerm.toLowerCase())
      ) || [];

    const stockValues = filtered.map((fabric) => {
      const fabricBatchList = fabricBatches.filter(
        (b) => b.fabricId === fabric.id
      );
      const avgCost = calculateWeightedAverage(fabricBatchList);
      const totalQty = fabricBatchList.reduce(
        (sum, batch) => sum + batch.quantity,
        0
      );

      return {
        ...fabric,
        totalQuantity: totalQty,
        averageCost: avgCost,
        currentValue: totalQty * avgCost,
        batches: fabricBatchList,
      };
    });

    const totals = stockValues.reduce(
      (acc, stock) => ({
        totalQuantity: acc.totalQuantity + stock.totalQuantity,
        totalValue: acc.totalValue + stock.currentValue,
        averageCost: acc.averageCost + stock.averageCost,
      }),
      { totalQuantity: 0, totalValue: 0, averageCost: 0 }
    );

    totals.averageCost = totals.averageCost / (stockValues.length || 1);

    return { filteredFabrics: stockValues, totals };
  }, [fabrics, fabricBatches, searchTerm]);

  const handleSellFabric = async (fabricId, quantity) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      const fabric = filteredFabrics.find((f) => f.id === fabricId);
      if (!fabric) throw new Error("Fabric not found");

      const result = calculateFifoSale(fabric.batches, quantity);

      for (const batch of result.updatedBatches) {
        if (batch.quantity > 0) {
          await updateFabricBatch(batch.id, { quantity: batch.quantity });
        } else {
          await deleteFabricBatch(batch.id);
        }
      }

      const saleTransaction = {
        fabricId,
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

  const handleAddFabric = async (fabricData) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await addFabric({
        ...fabricData,
        createdAt: new Date().toISOString(),
      });
      toast({
        title: "Success",
        description: "Fabric added successfully",
      });
    } catch (error) {
      console.error("Error adding fabric:", error);
      toast({
        title: "Error",
        description: "Failed to add fabric. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleEditFabric = async (fabricId, updatedData) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await updateFabric(fabricId, {
        ...updatedData,
        updatedAt: new Date().toISOString(),
      });
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

  const handleDeleteFabric = async (fabricId) => {
    if (!window.confirm("Are you sure you want to delete this fabric?")) {
      return;
    }

    setLoadingState((prev) => ({ ...prev, actions: true }));
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
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handlePurchaseStock = async (purchaseData) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await addFabricBatch({
        ...purchaseData,
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

  const handleExportCSV = () => {
    const data = filteredFabrics.map((f) => ({
      Code: f.code,
      Name: f.name,
      "Total Quantity": f.totalQuantity,
      "Average Cost": f.averageCost,
      "Current Value": f.currentValue,
    }));
    exportToCSV(data, "inventory-report.csv");
  };

  const handleExportPDF = () => {
    const data = {
      title: "Inventory Report",
      date: new Date().toLocaleDateString(),
      fabrics: filteredFabrics,
      summary: totals,
    };
    exportToPDF(data, "inventory-report.pdf");
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
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>

        {/* Table */}
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Fabric Inventory
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all fabric inventory
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
          <AddFabricDialog onAddFabric={handleAddFabric}>
            <Button
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white"
              disabled={loadingState.actions}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Fabric
            </Button>
          </AddFabricDialog>
          <PurchaseStockDialog
            fabrics={fabrics}
            suppliers={suppliers}
            onPurchaseStock={handlePurchaseStock}
          >
            <Button
              className="w-full md:w-auto"
              variant="outline"
              disabled={loadingState.actions}
            >
              <Package className="mr-2 h-4 w-4" />
              Purchase Stock
            </Button>
          </PurchaseStockDialog>
          <Button
            onClick={handleExportPDF}
            className="w-full md:w-auto"
            variant="outline"
            disabled={loadingState.actions}
          >
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            onClick={handleExportCSV}
            className="w-full md:w-auto"
            variant="outline"
            disabled={loadingState.actions}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="overflow-hidden border-none shadow-md">
          <CardContent className="p-0">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border-b border-blue-100 dark:border-blue-800">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Total Quantity
                </h3>
                <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                {totals.totalQuantity.toFixed(2)}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                Total stock quantity
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
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                ৳{totals.averageCost.toFixed(2)}
              </p>
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
                  Total Value
                </h3>
                <RefreshCw className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
                ৳{totals.totalValue.toFixed(2)}
              </p>
              <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
                Total inventory value
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Section */}
      <Card className="mb-8 border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search fabrics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="View Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="average">Weighted Average</SelectItem>
                <SelectItem value="fifo">FIFO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="border-none shadow-md">
        <CardContent className="p-6">
          {" "}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fabric Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Stock Qty</TableHead>
                <TableHead className="text-right">Avg. Cost</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                {viewMode === "fifo" && <TableHead>Batch Details</TableHead>}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFabrics.map((stock) => (
                <TableRow
                  key={stock.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/inventory/${stock.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{stock.code}</div>
                  </TableCell>
                  <TableCell>{stock.name}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        stock.totalQuantity > 0 ? "default" : "destructive"
                      }
                    >
                      {stock.totalQuantity.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ৳{stock.averageCost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ৳{stock.currentValue.toFixed(2)}
                  </TableCell>
                  {viewMode === "fifo" && (
                    <TableCell>
                      {stock.batches?.map((batch) => (
                        <div key={batch.id} className="text-sm">
                          Qty: {batch.quantity} @ ৳{batch.unitCost}
                        </div>
                      ))}
                    </TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex space-x-2">
                      <EditFabricDialog
                        fabric={stock}
                        onSave={handleEditFabric}
                        onDelete={handleDeleteFabric}
                      />
                      <SellFabricDialog
                        fabric={stock}
                        onSellFabric={handleSellFabric}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Fabric</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &ldquo;
                              {stock.name}&rdquo;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-500 hover:bg-red-600"
                              onClick={() => handleDeleteFabric(stock.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredFabrics.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No fabrics found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

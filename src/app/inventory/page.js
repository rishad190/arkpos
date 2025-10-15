"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/contexts/data-context";
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
import { SellFabricDialog } from "@/components/SellFabricDialog.jsx";
import { calculateFifoSale } from "@/lib/inventory-utils";
import { AddFabricDialog } from "@/components/AddFabricDialog.jsx";
import { PurchaseStockDialog } from "@/components/PurchaseStockDialog.jsx";
import { EditFabricDialog } from "@/components/EditFabricDialog.jsx";
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
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fabricToDelete, setFabricToDelete] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

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
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await deleteFabric(fabricToDelete);
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
      setDeleteDialogOpen(false);
      setFabricToDelete(null);
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

  const handlePrint = () => {
    setIsPrinting(true);
    const printWindow = window.open("", "_blank");
    const content = document.getElementById("printable-content");

    if (printWindow && content) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Inventory Report</title>
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
            <h1>Inventory Report</h1>
            <div class="summary">
              <div class="summary-item">Total Quantity: ${totals.totalQuantity.toFixed(
                2
              )}</div>
              <div class="summary-item">Average Cost: ৳${totals.averageCost.toFixed(
                2
              )}</div>
              <div class="summary-item">Total Value: ৳${totals.totalValue.toFixed(
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
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const FinancialSummary = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                    <p>Total stock quantity across all fabrics</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="p-4">
            <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {totals.totalQuantity.toFixed(2)}
            </p>
            <div className="mt-2">
              <Progress value={100} className="h-2 bg-blue-100" />
            </div>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Average cost per unit across all fabrics</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="p-4">
            <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
              ৳{totals.averageCost.toFixed(2)}
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
                Total Value
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <RefreshCw className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total inventory value across all fabrics</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="p-4">
            <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
              ৳{totals.totalValue.toFixed(2)}
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

  const columns = [
    {
      accessorKey: "code",
      header: "Fabric Code",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "totalQuantity",
      header: "Stock Qty",
      cell: ({ row }) => (
        <Badge variant={row.original.totalQuantity > 0 ? "default" : "destructive"}>
          {row.original.totalQuantity.toFixed(2)}
        </Badge>
      ),
    },
    {
      accessorKey: "averageCost",
      header: "Avg. Cost",
      cell: ({ row }) => `৳${row.original.averageCost.toFixed(2)}`,
    },
    {
      accessorKey: "currentValue",
      header: "Current Value",
      cell: ({ row }) => `৳${row.original.currentValue.toFixed(2)}`,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <EditFabricDialog
            fabric={row.original}
            onSave={handleEditFabric}
            onDelete={handleDeleteFabric}
          />
          <SellFabricDialog
            fabric={row.original}
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
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the fabric and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteFabric(row.original.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Fabric Inventory"
        description="Manage and track all fabric inventory"
        actions={
          <>
            <AddFabricDialog onAddFabric={handleAddFabric}>
              <Button
                className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white"
                disabled={loadingState.actions}
                aria-label="Add new fabric"
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
                aria-label="Purchase new stock"
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
              aria-label="Print inventory report"
            >
              <Printer className="mr-2 h-4 w-4" />
              {isPrinting ? "Printing..." : "Print Report"}
            </Button>
            <Button
              onClick={handleExportPDF}
              className="w-full md:w-auto"
              variant="outline"
              disabled={loadingState.actions}
              aria-label="Export inventory report to PDF"
            >
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button
              onClick={handleExportCSV}
              className="w-full md:w-auto"
              variant="outline"
              disabled={loadingState.actions}
              aria-label="Export inventory report to CSV"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </>
        }
      />

      {/* Financial Summary */}
      <FinancialSummary />

      <DataTable
        data={filteredFabrics}
        columns={columns}
        filterColumn="name"
      />

      {/* Add the Delete Confirmation Dialog */}
      <DeleteConfirmationDialog />

      {/* Add the printable content div */}
      <div id="printable-content" className="hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fabric Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Stock Qty</TableHead>
              <TableHead className="text-right">Avg. Cost</TableHead>
              <TableHead className="text-right">Current Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFabrics.map((stock) => (
              <TableRow key={stock.id}>
                <TableCell>{stock.code}</TableCell>
                <TableCell>{stock.name}</TableCell>
                <TableCell className="text-right">
                  {stock.totalQuantity.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  ৳{stock.averageCost.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  ৳{stock.currentValue.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

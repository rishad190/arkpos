"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/contexts/product-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, TrendingUp, TrendingDown, Package, MoreHorizontal } from "lucide-react";
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

export default function ProductsPage() {
  const router = useRouter();
  const { products, loading, totals, deleteProduct } = useProducts();
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteProduct(deletingId);
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-none">
        <PageHeader
          title="Product Ledger"
          description="Track investments, cashflow, and ROI per product or project."
          actions={
            <AddProductDialog>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Product
              </Button>
            </AddProductDialog>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
          <Table>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24">
                    <div className="flex items-center justify-center h-full">
                      <Skeleton className="h-8 w-[250px]" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[200px] text-center">
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
                        {product.notes && <div className="text-xs text-muted-foreground max-w-[200px] truncate">{product.notes}</div>}
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
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
                                    <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
    </div>
  );
}

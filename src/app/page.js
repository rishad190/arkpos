"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { LoadingState, TableSkeleton } from "@/components/LoadingState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { QuickStatCard } from "@/components/shared/QuickStatCard";
import { RecentTransactions } from "@/components/transactions/RecentTransactions";

import { useCustomers } from "@/contexts/customer-context";
import { useInventory } from "@/contexts/inventory-context";
import { useTransactions } from "@/contexts/transaction-context";



import {
  Users,
  Package,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  FileText,
  Download,
  RefreshCw,
  TrendingUp,
  History,
  Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const router = useRouter();
  const { customers, error: customerError } = useCustomers();
  const { transactions, calculateCustomerTotalDue, error: transactionError } = useTransactions();
  const { fabrics, suppliers, error: inventoryError } = useInventory();
  
  const error = customerError || transactionError || inventoryError;
  const getCustomerDue = calculateCustomerTotalDue;


  const [loadingState, setLoadingState] = useState({
    initial: true,
    transactions: true,
  });
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate totals and statistics
  const stats = useMemo(() => {
    if (!customers || !fabrics || !suppliers) {
      return {
        totalBill: 0,
        totalDeposit: 0,
        totalDue: 0,
        totalCustomers: 0,
        totalFabrics: 0,
        totalSuppliers: 0,
        recentTransactions: [],
        lowStockItems: [],
      };
    }

    const totals = customers.reduce(
      (acc, customer) => {
        const summary = customer.financialSummary || {
          totalRevenue: 0,
          totalDeposits: 0,
          totalDue: 0,
        };
        return {
          totalBill: acc.totalBill + (summary.totalRevenue || 0),
          totalDeposit: acc.totalDeposit + (summary.totalDeposits || 0),
          totalDue: acc.totalDue + (summary.totalDue || 0),
        };
      },
      { totalBill: 0, totalDeposit: 0, totalDue: 0 }
    );

    // Transactions are already sorted by createdAt desc in context
    const recentTransactions = (transactions || []).slice(0, 5);

    const lowStockItems = fabrics
      .filter((f) => f.totalQuantity < 10)
      .slice(0, 5);

    return {
      ...totals,
      totalCustomers: customers.length,
      totalFabrics: fabrics.length,
      totalSuppliers: suppliers.length,
      recentTransactions,
      lowStockItems,
    };
  }, [customers, transactions, fabrics, suppliers]);



  useEffect(() => {
    setMounted(true);
    if (mounted && transactions) {
      setLoadingState((prev) => ({ ...prev, initial: false }));
    }
  }, [mounted, transactions]);

  useEffect(() => {
    if (transactions) {
      setLoadingState((prev) => ({
        ...prev,
        transactions: false,
      }));
    }
  }, [transactions]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (loadingState.initial) {
    return <SkeletonLoader />;
  }

  return (
    <ErrorBoundary>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <PageHeader
          title="Dashboard"
          description="Welcome back! Here's an overview of your business"
          actions={
            <>
              <Button
                variant="outline"
                className="w-full md:w-auto"
                onClick={() => router.push("/customers")}
                aria-label="View customers"
              >
                <Users className="mr-2 h-4 w-4" />
                View Customers
              </Button>
              <Button
                className="w-full md:w-auto"
                onClick={() => router.push("/cashmemo")}
                aria-label="Create new cash memo"
              >
                <FileText className="mr-2 h-4 w-4" />
                New Cash Memo
              </Button>
            </>
          }
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickStatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            trend="up"
            trendValue="12%"
          />
          <QuickStatCard
            title="Total Fabrics"
            value={stats.totalFabrics}
            icon={Package}
            trend="up"
            trendValue="8%"
          />
          <QuickStatCard
            title="Total Suppliers"
            value={stats.totalSuppliers}
            icon={Users}
            trend="up"
            trendValue="5%"
          />
          <QuickStatCard
            title="Total Transactions"
            value={transactions?.length || 0}
            icon={History}
            trend="up"
            trendValue="15%"
          />
        </div>

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full md:w-auto grid-cols-2 gap-2">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Package className="w-4 h-4 mr-2" />
                Inventory
              </TabsTrigger>
            </TabsList>
            {activeTab === "overview" && (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="overview" className="space-y-4">
            {/* Financial Summary */}

            {/* Recent Activity and Low Stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RecentTransactions
                transactions={stats.recentTransactions}
                customers={customers}
              />

              <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Low Stock Items</CardTitle>
                    <CardDescription>Items that need attention</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/inventory")}
                  >
                    View All
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.lowStockItems.length > 0 ? (
                      stats.lowStockItems.map((fabric) => (
                        <div
                          key={fabric.id}
                          className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{fabric.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Code: {fabric.code}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {fabric.totalQuantity} units
                            </p>
                            <Badge variant="destructive">Low Stock</Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No low stock items
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Inventory Overview</CardTitle>
                  <CardDescription>
                    Quick overview of your inventory status
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/inventory")}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50 border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-blue-600">
                          Total Items
                        </span>
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-blue-700">
                        {stats.totalFabrics}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-green-600">
                          In Stock
                        </span>
                        <Package className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-700">
                        {fabrics.filter((f) => f.totalQuantity > 0).length}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50 border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-red-600">
                          Low Stock
                        </span>
                        <Package className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="text-2xl font-bold text-red-700">
                        {stats.lowStockItems.length}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}

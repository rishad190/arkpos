"use client";
import { useState, useEffect, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AddCustomerDialog } from "@/components/AddCustomerDialog";
import { EditCustomerDialog } from "@/components/EditCustomerDialog";
import { CustomerTable } from "@/components/CustomerTable";
import { SummaryCards } from "@/components/SummaryCards";
import { CustomerSearch } from "@/components/CustomerSearch";
import { Pagination } from "@/components/Pagination";
import { LoadingState, TableSkeleton } from "@/components/LoadingState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useData } from "@/app/data-context";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import {
  CUSTOMER_CONSTANTS,
  ERROR_MESSAGES,
  PAGE_TITLES,
} from "@/lib/constants";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const router = useRouter();
  const {
    customers,
    transactions,
    fabrics,
    suppliers,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerDue,
  } = useData();
  const { toast } = useToast();

  const [loadingState, setLoadingState] = useState({
    initial: true,
    customers: true,
    transactions: true,
    actions: false,
  });
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedFilter, setSelectedFilter] = useState(
    CUSTOMER_CONSTANTS.FILTER_OPTIONS.ALL
  );
  const [mounted, setMounted] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("customers");
  const [selectedTags, setSelectedTags] = useState([]);

  // Add debug logging
  useEffect(() => {
    console.log("Data Status:", {
      customers: customers?.length || 0,
      transactions: transactions?.length || 0,
      fabrics: fabrics?.length || 0,
      suppliers: suppliers?.length || 0,
      error,
    });
  }, [customers, transactions, fabrics, suppliers, error]);

  // Optimized statistics calculations
  const totals = useMemo(() => {
    if (!customers || !transactions) {
      return { totalBill: 0, totalDeposit: 0, totalDue: 0 };
    }
    return customers.reduce(
      (acc, customer) => {
        const customerTransactions =
          transactions?.filter((t) => t.customerId === customer.id) || [];
        acc.totalBill += customerTransactions.reduce(
          (sum, t) => sum + (t.total || 0),
          0
        );
        acc.totalDeposit += customerTransactions.reduce(
          (sum, t) => sum + (t.deposit || 0),
          0
        );
        acc.totalDue += getCustomerDue(customer.id);
        return acc;
      },
      { totalBill: 0, totalDeposit: 0, totalDue: 0 }
    );
  }, [customers, transactions, getCustomerDue]);

  const recentTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [transactions]);

  const lowStockItems = useMemo(() => {
    if (!fabrics) return [];
    return fabrics.filter((f) => f.totalQuantity < 10).slice(0, 5);
  }, [fabrics]);

  const stats = {
    ...totals,
    totalCustomers: customers?.length || 0,
    totalFabrics: fabrics?.length || 0,
    totalSuppliers: suppliers?.length || 0,
    recentTransactions,
    lowStockItems,
  };

  // Get all unique tags from customers
  const allTags = useMemo(() => {
    const tags = new Set();
    customers?.forEach((customer) => {
      customer.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [customers]);

  const customerNameMap = useMemo(() => {
    if (!customers) return new Map();
    return new Map(customers.map((c) => [c.id, c.name]));
  }, [customers]);

  const handleAddCustomer = async (customerData) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await addCustomer(customerData);
      setIsAddingCustomer(false);
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    } catch (error) {
      console.error(ERROR_MESSAGES.ADD_ERROR, error);
      toast({
        title: "Error",
        description: ERROR_MESSAGES.ADD_ERROR,
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleEditCustomer = async (customerId, updatedData) => {
    setLoadingState((prev) => ({ ...prev, actions: true }));
    try {
      await updateCustomer(customerId, updatedData);
      setEditingCustomer(null);
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    } catch (error) {
      console.error(ERROR_MESSAGES.UPDATE_ERROR, error);
      toast({
        title: "Error",
        description: ERROR_MESSAGES.UPDATE_ERROR,
        variant: "destructive",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, actions: false }));
    }
  };

  const handleRowClick = (customerId) => {
    router.push(`/customers/${customerId}`);
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm(ERROR_MESSAGES.DELETE_CONFIRMATION)) {
      setLoadingState((prev) => ({ ...prev, actions: true }));
      try {
        await deleteCustomer(customerId);
        toast({
          title: "Success",
          description: "Customer deleted successfully",
        });
      } catch (error) {
        console.error(ERROR_MESSAGES.DELETE_ERROR, error);
        toast({
          title: "Error",
          description: ERROR_MESSAGES.DELETE_ERROR,
          variant: "destructive",
        });
      } finally {
        setLoadingState((prev) => ({ ...prev, actions: false }));
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    if (mounted && customers) {
      setLoadingState((prev) => ({ ...prev, initial: false }));
    }
  }, [mounted, customers]);

  useEffect(() => {
    if (customers && transactions) {
      setLoadingState((prev) => ({
        ...prev,
        customers: false,
        transactions: false,
      }));
    }
  }, [customers, transactions]);

  const filteredCustomers = useMemo(() => {
    return (customers || []).filter((customer) => {
      if (!customer) return false;

      const matchesSearch =
        customer.name
          ?.toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        customer.phone?.includes(debouncedSearchTerm);

      const currentDue = getCustomerDue(customer.id);
      const matchesFilter =
        selectedFilter === CUSTOMER_CONSTANTS.FILTER_OPTIONS.ALL ||
        (selectedFilter === CUSTOMER_CONSTANTS.FILTER_OPTIONS.DUE &&
          currentDue > 0) ||
        (selectedFilter === CUSTOMER_CONSTANTS.FILTER_OPTIONS.PAID &&
          currentDue === 0);

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => customer.tags?.includes(tag));

      return matchesSearch && matchesFilter && matchesTags;
    });
  }, [
    customers,
    debouncedSearchTerm,
    selectedFilter,
    selectedTags,
    getCustomerDue,
  ]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (loadingState.initial || !customers) {
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickStatSkeleton />
          <QuickStatSkeleton />
          <QuickStatSkeleton />
          <QuickStatSkeleton />
        </div>

        {/* Recent Activity */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {PAGE_TITLES.CUSTOMER_MANAGEMENT}
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here&apos;s an overview of your business
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <AddCustomerDialog
              isOpen={isAddingCustomer}
              onClose={() => setIsAddingCustomer(false)}
              onAddCustomer={handleAddCustomer}
            >
              <Button
                className="w-full md:w-auto"
                disabled={loadingState.actions}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </AddCustomerDialog>
            <Button
              variant="outline"
              className="w-full md:w-auto"
              onClick={() => router.push("/cashmemo")}
              disabled={loadingState.actions}
            >
              <FileText className="mr-2 h-4 w-4" />
              New Cash Memo
            </Button>
          </div>
        </div>

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
            <TabsList className="grid w-full md:w-auto grid-cols-3 gap-2">
              <TabsTrigger
                value="customers"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="w-4 h-4 mr-2" />
                Customers
              </TabsTrigger>
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

          <TabsContent value="customers" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-blue-600">
                      Total Bill Amount
                    </h3>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    ৳{stats.totalBill.toLocaleString()}
                  </div>
                  <div className="flex items-center mt-2 text-sm text-blue-600">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    <span>12% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-green-600">
                      Total Deposit
                    </h3>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    ৳{stats.totalDeposit.toLocaleString()}
                  </div>
                  <div className="flex items-center mt-2 text-sm text-green-600">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    <span>8% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-red-600">
                      Total Due Amount
                    </h3>
                    <DollarSign className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-700">
                    ৳{stats.totalDue.toLocaleString()}
                  </div>
                  <div className="flex items-center mt-2 text-sm text-red-600">
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                    <span>3% from last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-col gap-4">
              <CustomerSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedFilter={selectedFilter}
                onFilterChange={setSelectedFilter}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                allTags={allTags}
              />
              <Button
                onClick={() => setIsAddingCustomer(true)}
                className="w-full md:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>

            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Customer List</CardTitle>
                <CardDescription>
                  Showing {filteredCustomers.length} customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {loadingState.customers ? (
                    <TableSkeleton />
                  ) : (
                    <CustomerTable
                      customers={filteredCustomers}
                      getCustomerDue={getCustomerDue}
                      onRowClick={handleRowClick}
                      onEdit={setEditingCustomer}
                      onDelete={handleDeleteCustomer}
                      currentPage={currentPage}
                      customersPerPage={CUSTOMER_CONSTANTS.CUSTOMERS_PER_PAGE}
                    />
                  )}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredCustomers.length}
                  itemsPerPage={CUSTOMER_CONSTANTS.CUSTOMERS_PER_PAGE}
                  onPageChange={setCurrentPage}
                  className="mt-4"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            {/* Financial Summary */}

            {/* Recent Activity and Low Stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                      Latest customer transactions
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/cashbook")}
                  >
                    View All
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentTransactions.length > 0 ? (
                      stats.recentTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          <div>
                            <p className="font-medium">
                              {customerNameMap.get(transaction.customerId) ||
                                "Unknown Customer"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ৳{transaction.total?.toLocaleString()}
                            </p>
                            <Badge
                              variant={
                                transaction.deposit >= transaction.total
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {transaction.deposit >= transaction.total
                                ? "Paid"
                                : "Partial"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent transactions
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

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

        {editingCustomer && (
          <EditCustomerDialog
            customer={editingCustomer}
            isOpen={!!editingCustomer}
            onClose={() => setEditingCustomer(null)}
            onEditCustomer={handleEditCustomer}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

// Loading skeleton components
const SummaryCardSkeleton = memo(function SummaryCardSkeleton() {
  return (
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
});

const QuickStatSkeleton = memo(function QuickStatSkeleton() {
  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </div>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
});

const QuickStatCard = memo(function QuickStatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
}) {
  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div
          className={`flex items-center mt-2 text-sm ${
            trend === "up" ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend === "up" ? (
            <ArrowUpRight className="h-4 w-4 mr-1" />
          ) : (
            <ArrowDownRight className="h-4 w-4 mr-1" />
          )}
          <span>{trendValue} from last month</span>
        </div>
      </CardContent>
    </Card>
  );
});

"use client";"use client";"use client";



import { useEffect, useMemo, useState } from "react";import { useState, useEffect, useMemo } from "react";

import { useParams } from "next/navigation";

import { format } from "date-fns";import { useEffect, useMemo, useState } from "react";import { useParams, useRouter } from "next/navigation";

import { useData } from "@/contexts/data-context";

import { useToast } from "@/hooks/use-toast";import { useParams } from "next/navigation";import { useData } from "@/contexts/data-context";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";import { format } from "date-fns";

import {

  Select,import { useData } from "@/contexts/data-context";import { Button } from "@/components/ui/button";

  SelectContent,

  SelectItem,import { useToast } from "@/hooks/use-toast";import {

  SelectTrigger,

  SelectValue,import { Button } from "@/components/ui/button";  Card,

} from "@/components/ui/select";

import {import { Input } from "@/components/ui/input";  CardContent,

  AlertDialog,

  AlertDialogAction,import {  CardHeader,

  AlertDialogCancel,

  AlertDialogContent,  Select,  CardTitle,

  AlertDialogDescription,

  AlertDialogFooter,  SelectContent,  CardDescription,

  AlertDialogHeader,

  AlertDialogTitle,  SelectItem,} from "@/components/ui/card";

} from "@/components/ui/alert-dialog";

import {  SelectTrigger,import {

  DropdownMenu,

  DropdownMenuContent,  SelectValue,  Table,

  DropdownMenuItem,

  DropdownMenuTrigger,} from "@/components/ui/select";  TableBody,

} from "@/components/ui/dropdown-menu";

import { DotsHorizontalIcon, FileDownIcon, EditIcon, TrashIcon } from "lucide-react";import {  TableCell,

import PageHeader from "@/components/common/PageHeader";

import SkeletonLoader from "@/components/common/SkeletonLoader";  AlertDialog,  TableHead,

import SummaryCards from "@/components/SummaryCards";

import DataTable from "@/components/common/DataTable";  AlertDialogAction,  TableHeader,

import DateRangePicker from "@/components/DateRangePicker";

import AddSupplierTransactionDialog from "@/components/AddSupplierTransactionDialog";  AlertDialogCancel,  TableRow,

import EditSupplierTransactionDialog from "@/components/EditSupplierTransactionDialog";

import { TRANSACTION_CONSTANTS, ERROR_MESSAGES } from "@/lib/constants";  AlertDialogContent,} from "@/components/ui/table";

import { currencyFormat, exportToCSV } from "@/lib/utils";

  AlertDialogDescription,import { Badge } from "@/components/ui/badge";

export default function SupplierPage() {

  const params = useParams();  AlertDialogFooter,import { Avatar, AvatarFallback } from "@/components/ui/avatar";

  const { toast } = useToast();

  const {  AlertDialogHeader,import {

    suppliers,

    supplierTransactions,  AlertDialogTitle,  DropdownMenu,

    addSupplierTransaction,

    updateSupplierTransaction,} from "@/components/ui/alert-dialog";  DropdownMenuContent,

    deleteSupplierTransaction,

  } = useData();import {  DropdownMenuItem,



  const [loadingState, setLoadingState] = useState({  DropdownMenu,  DropdownMenuTrigger,

    initial: true,

    transactions: true,  DropdownMenuContent,} from "@/components/ui/dropdown-menu";

    action: false,

  });  DropdownMenuItem,import { AddSupplierTransactionDialog } from "@/components/AddSupplierTransactionDialog.jsx";

  const [storeFilter, setStoreFilter] = useState(TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL);

  const [dateRange, setDateRange] = useState({ from: null, to: null });  DropdownMenuTrigger,import { EditSupplierTransactionDialog } from "@/components/EditSupplierTransactionDialog.jsx";

  const [searchTerm, setSearchTerm] = useState("");

  const [editingTransaction, setEditingTransaction] = useState(null);} from "@/components/ui/dropdown-menu";import { LoadingState, TableSkeleton } from "@/components/LoadingState.jsx";

  const [deleteTarget, setDeleteTarget] = useState(null);

import PageHeader from "@/components/common/PageHeader";import { ErrorBoundary } from "@/components/ErrorBoundary.jsx";

  const supplier = suppliers?.find((s) => s.id === params.id);

import SkeletonLoader from "@/components/common/SkeletonLoader";import {

  const supplierTransactionsWithBalance = useMemo(() => {

    if (!supplierTransactions) return [];import SummaryCards from "@/components/SummaryCards";  ArrowLeft,



    return supplierTransactionsimport DataTable from "@/components/common/DataTable";  Phone,

      .filter((t) => t.supplierId === params.id)

      .filter((t) => storeFilter === TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL || t.storeId === storeFilter)import DateRangePicker from "@/components/DateRangePicker";  Mail,

      .sort((a, b) => new Date(a.date) - new Date(b.date))

      .reduce((acc, transaction) => {import AddSupplierTransactionDialog from "@/components/AddSupplierTransactionDialog";  Store,

        const previousBalance = acc.length > 0 ? acc[acc.length - 1].cumulativeBalance : 0;

        return [import EditSupplierTransactionDialog from "@/components/EditSupplierTransactionDialog";  MoreVertical,

          ...acc,

          {import { DotsHorizontalIcon, FileDownIcon, EditIcon, TrashIcon } from "lucide-react";  FileText,

            ...transaction,

            cumulativeBalance: previousBalance + (transaction.due || 0),import { TRANSACTION_CONSTANTS } from "@/lib/constants";  Download,

          },

        ];import { currencyFormat, exportToCSV } from "@/lib/utils";  ArrowUpRight,

      }, []);

  }, [supplierTransactions, params.id, storeFilter]);import { ERROR_MESSAGES } from "@/lib/constants";  ArrowDownRight,



  useEffect(() => {  RefreshCw,

    if (supplier && supplierTransactions) {

      setLoadingState((prev) => ({ ...prev, initial: false, transactions: false }));export default function SupplierPage() {  Tag,

    }

  }, [supplier, supplierTransactions]);  const params = useParams();} from "lucide-react";



  const handleAddTransaction = async (transactionData) => {  const { toast } = useToast();import {

    try {

      setLoadingState((prev) => ({ ...prev, action: true }));  const {  AlertDialog,

      await addSupplierTransaction({

        ...transactionData,    suppliers,  AlertDialogAction,

        supplierId: params.id,

        date: new Date().toISOString(),    supplierTransactions,  AlertDialogCancel,

      });

      toast({ title: 'Success', description: 'Transaction added successfully' });    addSupplierTransaction,  AlertDialogContent,

    } catch (error) {

      console.error(ERROR_MESSAGES.ADD_ERROR, error);    updateSupplierTransaction,  AlertDialogDescription,

      toast({ title: 'Error', description: ERROR_MESSAGES.ADD_ERROR, variant: 'destructive' });

    } finally {    deleteSupplierTransaction,  AlertDialogFooter,

      setLoadingState((prev) => ({ ...prev, action: false }));

    }  } = useData();  AlertDialogHeader,

  };

  AlertDialogTitle,

  const handleDeleteTransaction = async (transactionId) => {

    try {  const [loadingState, setLoadingState] = useState({  AlertDialogTrigger,

      setLoadingState((prev) => ({ ...prev, action: true }));

      await deleteSupplierTransaction(transactionId);    initial: true,} from "@/components/ui/alert-dialog";

      setDeleteTarget(null);

      toast({ title: 'Success', description: 'Transaction deleted successfully' });    transactions: true,import { formatDate, exportToCSV, exportToPDF } from "@/lib/utils";

    } catch (error) {

      console.error(ERROR_MESSAGES.DELETE_ERROR, error);    action: false,import { TRANSACTION_CONSTANTS, ERROR_MESSAGES } from "@/lib/constants";

      toast({ title: 'Error', description: ERROR_MESSAGES.DELETE_ERROR, variant: 'destructive' });

    } finally {  });import { useToast } from "@/hooks/use-toast";

      setLoadingState((prev) => ({ ...prev, action: false }));

    }  const [storeFilter, setStoreFilter] = useState(TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL);import { Input } from "@/components/ui/input";

  };

  const [dateRange, setDateRange] = useState({ from: null, to: null });import { DateRangePicker } from "@/components/DateRangePicker.jsx";

  const handleEditTransaction = async (transactionId, updatedData) => {

    try {  const [searchTerm, setSearchTerm] = useState("");import { Progress } from "@/components/ui/progress";

      setLoadingState((prev) => ({ ...prev, action: true }));

  const [editingTransaction, setEditingTransaction] = useState(null);import { ScrollArea } from "@/components/ui/scroll-area";

      if (!transactionId) {

        throw new Error("Transaction ID is required");  const [deleteTarget, setDeleteTarget] = useState(null);

      }

export default function SupplierDetail() {

      const trimmedMemo = updatedData.invoiceNumber?.trim();

      const totalAmount = parseFloat(updatedData.totalAmount);  const supplier = suppliers?.find((s) => s.id === params.id);  const params = useParams();

      const paidAmount = parseFloat(updatedData.paidAmount);

  const router = useRouter();

      if (isNaN(totalAmount) || isNaN(paidAmount)) {

        throw new Error("Invalid amount values");  const supplierTransactionsWithBalance = useMemo(() => {  const { toast } = useToast();

      }

    if (!supplierTransactions) return [];  const {

      const processedData = {

        ...updatedData,    suppliers,

        invoiceNumber: trimmedMemo,

        totalAmount,    return supplierTransactions    supplierTransactions,

        paidAmount,

        due: totalAmount - paidAmount,      .filter((t) => t.supplierId === params.id)    addSupplierTransaction,

        supplierId: params.id,

        id: transactionId,      .filter((t) => storeFilter === TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL || t.storeId === storeFilter)    deleteSupplierTransaction,

        updatedAt: new Date().toISOString(),

      };      .sort((a, b) => new Date(a.date) - new Date(b.date))    updateSupplierTransaction,



      await updateSupplierTransaction(transactionId, processedData);      .reduce((acc, transaction) => {    getSupplierDue,

      setEditingTransaction(null);

      toast({ title: 'Success', description: 'Transaction updated successfully' });        const previousBalance = acc.length > 0 ? acc[acc.length - 1].cumulativeBalance : 0;  } = useData();

    } catch (error) {

      console.error(ERROR_MESSAGES.UPDATE_ERROR, error);        return [  const [loadingState, setLoadingState] = useState({

      toast({

        title: 'Error',          ...acc,    initial: true,

        description: error.message || ERROR_MESSAGES.UPDATE_ERROR,

        variant: 'destructive',          {    transactions: true,

      });

    } finally {            ...transaction,    action: false,

      setLoadingState((prev) => ({ ...prev, action: false }));

    }            cumulativeBalance: previousBalance + (transaction.due || 0),  });

  };

          },  const [storeFilter, setStoreFilter] = useState(TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL);

  const handleExportCSV = () => {

    const data = supplierTransactionsWithBalance.map((t) => ({        ];  const [dateRange, setDateRange] = useState({ from: null, to: null });

      Date: new Date(t.date)

        .toLocaleDateString("en-GB", {      }, []);  const [searchTerm, setSearchTerm] = useState("");

          day: "2-digit",

          month: "2-digit",  }, [supplierTransactions, params.id, storeFilter]);  const [editingTransaction, setEditingTransaction] = useState(null);

          year: "numeric",

        })  const [deleteTarget, setDeleteTarget] = useState(null);

        .replace(/\//g, "-"),

      Invoice: t.invoiceNumber,  useEffect(() => {

      Details: t.details,

      Total: `${t.totalAmount.toLocaleString()}`,    if (supplier && supplierTransactions) {  const supplier = suppliers?.find((s) => s.id === params.id);

      Paid: `${t.paidAmount.toLocaleString()}`,

      Due: `${t.due.toLocaleString()}`,      setLoadingState((prev) => ({ ...prev, initial: false, transactions: false }));

      Balance: `${t.cumulativeBalance.toLocaleString()}`,

      Store: t.storeId,    }  const supplierTransactionsWithBalance = useMemo(() => {

    }));

    exportToCSV(data, `${supplier?.name}-transactions-${params.id}.csv`);  }, [supplier, supplierTransactions]);    if (!supplierTransactions) return [];

  };



  if (loadingState.initial || !supplier) {

    return (  const handleAddTransaction = async (transactionData) => {    return supplierTransactions

      <div className="h-[80vh]">

        <SkeletonLoader type="table" />    try {      .filter((t) => t.supplierId === params.id)

      </div>

    );      setLoadingState((prev) => ({ ...prev, action: true }));      .filter((t) => storeFilter === TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL || t.storeId === storeFilter)

  }

      await addSupplierTransaction({      .sort((a, b) => new Date(a.date) - new Date(b.date))

  const columns = [

    {        ...transactionData,      .reduce((acc, transaction) => {

      name: "Date",

      cell: (row) => format(new Date(row.date), "dd-MM-yyyy"),        supplierId: params.id,        const previousBalance = acc.length > 0 ? acc[acc.length - 1].cumulativeBalance : 0;

      sortable: true,

      width: "100px",        date: new Date().toISOString(),        return [

    },

    {      });          ...acc,

      name: "Invoice No.",

      selector: "invoiceNumber",      toast({ title: 'Success', description: 'Transaction added successfully' });          {

      sortable: true,

      width: "130px",    } catch (error) {            ...transaction,

    },

    {      console.error(ERROR_MESSAGES.ADD_ERROR, error);            cumulativeBalance: previousBalance + (transaction.due || 0),

      name: "Details",

      selector: "details",      toast({ title: 'Error', description: ERROR_MESSAGES.ADD_ERROR, variant: 'destructive' });          },

      sortable: true,

      grow: 2,    } finally {        ];

    },

    {      setLoadingState((prev) => ({ ...prev, action: false }));      }, []);

      name: "Total Amount",

      cell: (row) => currencyFormat(row.totalAmount),    }  }, [supplierTransactions, params.id, storeFilter]);

      sortable: true,

      right: true,  };

      width: "130px",

    },  useEffect(() => {

    {

      name: "Paid Amount",  const handleDeleteTransaction = async (transactionId) => {    if (supplier && supplierTransactions) {

      cell: (row) => currencyFormat(row.paidAmount),

      sortable: true,    try {      setLoadingState((prev) => ({ ...prev, initial: false, transactions: false }));

      right: true,

      width: "130px",      setLoadingState((prev) => ({ ...prev, action: true }));    }

    },

    {      await deleteSupplierTransaction(transactionId);  }, [supplier, supplierTransactions]);

      name: "Due Amount",

      cell: (row) => currencyFormat(row.due),      setDeleteTarget(null);

      sortable: true,

      right: true,      toast({ title: 'Success', description: 'Transaction deleted successfully' });  const handleAddTransaction = async (transactionData) => {

      width: "130px",

    },    } catch (error) {    try {

    {

      name: "Balance",      console.error(ERROR_MESSAGES.DELETE_ERROR, error);      setLoadingState((prev) => ({ ...prev, action: true }));

      cell: (row) => currencyFormat(row.cumulativeBalance),

      sortable: true,      toast({ title: 'Error', description: ERROR_MESSAGES.DELETE_ERROR, variant: 'destructive' });      await addSupplierTransaction({

      right: true,

      width: "130px",    } finally {        ...transactionData,

    },

    {      setLoadingState((prev) => ({ ...prev, action: false }));        supplierId: params.id,

      name: "Store",

      selector: "storeId",    }        date: new Date().toISOString(),

      sortable: true,

      width: "100px",  };      });

    },

    {      toast({ title: 'Success', description: 'Transaction added successfully' });

      name: "Actions",

      cell: (row) => (  const handleEditTransaction = async (transactionId, updatedData) => {    } catch (error) {

        <DropdownMenu>

          <DropdownMenuTrigger asChild>    try {      console.error(ERROR_MESSAGES.ADD_ERROR, error);

            <Button variant="ghost" className="h-8 w-8 p-0">

              <span className="sr-only">Open menu</span>      setLoadingState((prev) => ({ ...prev, action: true }));      toast({ title: 'Error', description: ERROR_MESSAGES.ADD_ERROR, variant: 'destructive' });

              <DotsHorizontalIcon className="h-4 w-4" />

            </Button>    } finally {

          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">      if (!transactionId) {      setLoadingState((prev) => ({ ...prev, action: false }));

            <DropdownMenuItem

              onClick={() => setEditingTransaction(row)}        throw new Error("Transaction ID is required");    }

              className="cursor-pointer"

            >      }  };

              <EditIcon className="mr-2 h-4 w-4" />

              Edit

            </DropdownMenuItem>

            <DropdownMenuItem      const trimmedMemo = updatedData.invoiceNumber?.trim();  const handleDeleteTransaction = async (transactionId) => {

              onClick={() => setDeleteTarget(row)}

              className="cursor-pointer text-red-600"      const totalAmount = parseFloat(updatedData.totalAmount);    try {

            >

              <TrashIcon className="mr-2 h-4 w-4" />      const paidAmount = parseFloat(updatedData.paidAmount);      setLoadingState((prev) => ({ ...prev, action: true }));

              Delete

            </DropdownMenuItem>      await deleteSupplierTransaction(transactionId);

          </DropdownMenuContent>

        </DropdownMenu>      if (isNaN(totalAmount) || isNaN(paidAmount)) {      setDeleteTarget(null);

      ),

      ignoreRowClick: true,        throw new Error("Invalid amount values");      toast({ title: 'Success', description: 'Transaction deleted successfully' });

      button: true,

      width: "100px",      }    } catch (error) {

    },

  ];      console.error(ERROR_MESSAGES.DELETE_ERROR, error);



  const summary = useMemo(() => {      const processedData = {      toast({ title: 'Error', description: ERROR_MESSAGES.DELETE_ERROR, variant: 'destructive' });

    const totals = supplierTransactionsWithBalance.reduce(

      (acc, t) => ({        ...updatedData,    } finally {

        totalAmount: acc.totalAmount + (t.totalAmount || 0),

        paidAmount: acc.paidAmount + (t.paidAmount || 0),        invoiceNumber: trimmedMemo,      setLoadingState((prev) => ({ ...prev, action: false }));

      }),

      { totalAmount: 0, paidAmount: 0 }        totalAmount,    }

    );

        paidAmount,  };

    const balance = totals.totalAmount - totals.paidAmount;

        due: totalAmount - paidAmount,

    return [

      {        supplierId: params.id,  const handleEditTransaction = async (transactionId, updatedData) => {

        title: "Total Purchased",

        metric: currencyFormat(totals.totalAmount),        id: transactionId,    try {

        color: "text-gray-600",

      },        updatedAt: new Date().toISOString(),      setLoadingState((prev) => ({ ...prev, action: true }));

      {

        title: "Total Paid",      };

        metric: currencyFormat(totals.paidAmount),

        color: "text-green-600",      if (!transactionId) {

      },

      {      await updateSupplierTransaction(transactionId, processedData);        throw new Error("Transaction ID is required");

        title: "Balance",

        metric: currencyFormat(balance),      setEditingTransaction(null);      }

        color: balance < 0 ? "text-green-600" : "text-red-600",

      },      toast({ title: 'Success', description: 'Transaction updated successfully' });

    ];

  }, [supplierTransactionsWithBalance]);    } catch (error) {      const trimmedMemo = updatedData.invoiceNumber?.trim();



  return (      console.error(ERROR_MESSAGES.UPDATE_ERROR, error);      const totalAmount = parseFloat(updatedData.totalAmount);

    <div className="container mx-auto py-10">

      <PageHeader heading={supplier.name} text="Supplier transactions and details">      toast({      const paidAmount = parseFloat(updatedData.paidAmount);

        <div className="flex items-center gap-4">

          <div className="flex items-center gap-2">        title: 'Error',

            <Select

              value={storeFilter}        description: error.message || ERROR_MESSAGES.UPDATE_ERROR,      if (isNaN(totalAmount) || isNaN(paidAmount)) {

              onValueChange={(value) => setStoreFilter(value)}

            >        variant: 'destructive',        throw new Error("Invalid amount values");

              <SelectTrigger className="w-[180px]">

                <SelectValue placeholder="Select store" />      });      }

              </SelectTrigger>

              <SelectContent>    } finally {

                <SelectItem value={TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL}>

                  All Stores      setLoadingState((prev) => ({ ...prev, action: false }));      const processedData = {

                </SelectItem>

                <SelectItem value={TRANSACTION_CONSTANTS.STORE_OPTIONS.STORE_1}>    }        ...updatedData,

                  Store 1

                </SelectItem>  };        invoiceNumber: trimmedMemo,

                <SelectItem value={TRANSACTION_CONSTANTS.STORE_OPTIONS.STORE_2}>

                  Store 2        totalAmount,

                </SelectItem>

              </SelectContent>  const handleExportCSV = () => {        paidAmount,

            </Select>

            <DateRangePicker    const data = supplierTransactionsWithBalance.map((t) => ({        due: totalAmount - paidAmount,

              date={dateRange}

              onChange={setDateRange}      Date: new Date(t.date)        supplierId: params.id,

              align="start"

              className="w-auto"        .toLocaleDateString("en-GB", {        id: transactionId,

            />

          </div>          day: "2-digit",        updatedAt: new Date().toISOString(),

          <AddSupplierTransactionDialog onSubmit={handleAddTransaction} />

          <Button onClick={handleExportCSV} variant="outline">          month: "2-digit",      };

            <FileDownIcon className="mr-2 h-4 w-4" />

            Export CSV          year: "numeric",

          </Button>

        </div>        })      await updateSupplierTransaction(transactionId, processedData);

      </PageHeader>

        .replace(/\//g, "-"),      setEditingTransaction(null);

      <div className="mb-6">

        <SummaryCards data={summary} loading={loadingState.action} />      Invoice: t.invoiceNumber,      toast({ title: 'Success', description: 'Transaction updated successfully' });

      </div>

      Details: t.details,    } catch (error) {

      <DataTable

        columns={columns}      Total: `${t.totalAmount.toLocaleString()}`,      console.error(ERROR_MESSAGES.UPDATE_ERROR, error);

        data={supplierTransactionsWithBalance}

        progressPending={loadingState.transactions}      Paid: `${t.paidAmount.toLocaleString()}`,      toast({

        pagination

      />      Due: `${t.due.toLocaleString()}`,        title: 'Error',



      {editingTransaction && (      Balance: `${t.cumulativeBalance.toLocaleString()}`,        description: error.message || ERROR_MESSAGES.UPDATE_ERROR,

        <EditSupplierTransactionDialog

          transaction={editingTransaction}      Store: t.storeId,        variant: 'destructive',

          onClose={() => setEditingTransaction(null)}

          onSubmit={(data) => handleEditTransaction(editingTransaction.id, data)}    }));      });

        />

      )}    exportToCSV(data, `${supplier?.name}-transactions-${params.id}.csv`);    } finally {



      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>  };      setLoadingState((prev) => ({ ...prev, action: false }));

        <AlertDialogContent>

          <AlertDialogHeader>    }

            <AlertDialogTitle>Are you sure?</AlertDialogTitle>

            <AlertDialogDescription>  if (loadingState.initial || !supplier) {  };

              This will permanently delete this transaction. This action cannot be undone.

            </AlertDialogDescription>    return (

          </AlertDialogHeader>

          <AlertDialogFooter>      <div className="h-[80vh]">  const handleExportCSV = () => {

            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction        <SkeletonLoader type="table" />    const data = supplierTransactionsWithBalance.map((t) => ({

              onClick={() => handleDeleteTransaction(deleteTarget?.id)}

              className="bg-red-600 focus:ring-red-600"      </div>      Date: new Date(t.date)

            >

              Delete    );        .toLocaleDateString("en-GB", {

            </AlertDialogAction>

          </AlertDialogFooter>  }          day: "2-digit",

        </AlertDialogContent>

      </AlertDialog>          month: "2-digit",

    </div>

  );  const columns = [          year: "numeric",

}
    {        })

      name: "Date",        .replace(/\//g, "-"),

      cell: (row) => format(new Date(row.date), "dd-MM-yyyy"),      Invoice: t.invoiceNumber,

      sortable: true,      Details: t.details,

      width: "100px",      Total: `${t.totalAmount.toLocaleString()}`,

    },      Paid: `${t.paidAmount.toLocaleString()}`,

    {      Due: `${t.due.toLocaleString()}`,

      name: "Invoice No.",      Balance: `${t.cumulativeBalance.toLocaleString()}`,

      selector: "invoiceNumber",      Store: t.storeId,

      sortable: true,    }));

      width: "130px",    exportToCSV(data, `${supplier?.name}-transactions-${params.id}.csv`);

    },  };

    {      Name: s.name,

      name: "Details",      Phone: s.phone,

      selector: "details",      Email: s.email,

      sortable: true,      Address: s.address,

      grow: 2,      Store: s.storeId,

    },      "Total Due": s.totalDue || 0,

    {    }));

      name: "Total Amount",    exportToCSV(data, "suppliers-report.csv");

      cell: (row) => currencyFormat(row.totalAmount),  };

      sortable: true,

      right: true,  const handleExportPDF = () => {

      width: "130px",    const data = {

    },      title: "Suppliers Report",

    {      date: new Date().toLocaleDateString(),

      name: "Paid Amount",      suppliers: filteredSuppliers,

      cell: (row) => currencyFormat(row.paidAmount),      summary: totals,

      sortable: true,    };

      right: true,    exportToPDF(data, "suppliers-report.pdf");

      width: "130px",  };

    },

    {  // Loading skeleton components

      name: "Due Amount",  const SummaryCardSkeleton = () => (

      cell: (row) => currencyFormat(row.due),    <Card className="overflow-hidden border-none shadow-md">

      sortable: true,      <CardContent className="p-0">

      right: true,        <div className="p-4 border-b">

      width: "130px",          <div className="flex justify-between items-center">

    },            <Skeleton className="h-4 w-24" />

    {            <Skeleton className="h-4 w-4" />

      name: "Balance",          </div>

      cell: (row) => currencyFormat(row.cumulativeBalance),        </div>

      sortable: true,        <div className="p-4">

      right: true,          <Skeleton className="h-8 w-32 mb-2" />

      width: "130px",          <Skeleton className="h-3 w-24" />

    },        </div>

    {      </CardContent>

      name: "Store",    </Card>

      selector: "storeId",  );

      sortable: true,

      width: "100px",  const TableSkeleton = () => (

    },    <Card className="border-none shadow-md">

    {      <CardContent className="p-6">

      name: "Actions",        <div className="space-y-4">

      cell: (row) => (          <Skeleton className="h-10 w-full" />

        <DropdownMenu>          {[...Array(5)].map((_, i) => (

          <DropdownMenuTrigger asChild>            <div key={i} className="flex items-center gap-4 py-4">

            <Button variant="ghost" className="h-8 w-8 p-0">              <Skeleton className="h-4 w-24" />

              <span className="sr-only">Open menu</span>              <Skeleton className="h-4 w-24" />

              <DotsHorizontalIcon className="h-4 w-4" />              <Skeleton className="h-4 w-24" />

            </Button>              <Skeleton className="h-4 w-24" />

          </DropdownMenuTrigger>              <Skeleton className="h-4 w-24" />

          <DropdownMenuContent align="end">              <Skeleton className="h-4 w-10" />

            <DropdownMenuItem            </div>

              onClick={() => setEditingTransaction(row)}          ))}

              className="cursor-pointer"        </div>

            >      </CardContent>

              <EditIcon className="mr-2 h-4 w-4" />    </Card>

              Edit  );

            </DropdownMenuItem>

            <DropdownMenuItem  if (loadingState.initial) {

              onClick={() => setDeleteTarget(row)}    return (

              className="cursor-pointer text-red-600"      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

            >        {/* Header Skeleton */}

              <TrashIcon className="mr-2 h-4 w-4" />        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">

              Delete          <div>

            </DropdownMenuItem>            <Skeleton className="h-8 w-32 mb-2" />

          </DropdownMenuContent>            <Skeleton className="h-4 w-48" />

        </DropdownMenu>          </div>

      ),          <div className="flex gap-2">

      ignoreRowClick: true,            <Skeleton className="h-10 w-32" />

      button: true,            <Skeleton className="h-10 w-32" />

      width: "100px",            <Skeleton className="h-10 w-32" />

    },          </div>

  ];        </div>



  const summary = useMemo(() => {        {/* Summary Cards */}

    const totals = supplierTransactionsWithBalance.reduce(        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      (acc, t) => ({          <SummaryCardSkeleton />

        totalAmount: acc.totalAmount + (t.totalAmount || 0),          <SummaryCardSkeleton />

        paidAmount: acc.paidAmount + (t.paidAmount || 0),          <SummaryCardSkeleton />

      }),        </div>

      { totalAmount: 0, paidAmount: 0 }

    );        {/* Table */}

        <TableSkeleton />

    const balance = totals.totalAmount - totals.paidAmount;      </div>

    );

    return [  }

      {

        title: "Total Purchased",  const columns = [

        metric: currencyFormat(totals.totalAmount),    {

        color: "text-gray-600",      accessorKey: "name",

      },      header: "Supplier Name",

      {    },

        title: "Total Paid",    {

        metric: currencyFormat(totals.paidAmount),      accessorKey: "contact",

        color: "text-green-600",      header: "Contact",

      },      cell: ({ row }) => (

      {        <div>

        title: "Balance",          <div>{row.original.phone}</div>

        metric: currencyFormat(balance),          <div className="text-sm text-gray-500">{row.original.email}</div>

        color: balance < 0 ? "text-green-600" : "text-red-600",        </div>

      },      ),

    ];    },

  }, [supplierTransactionsWithBalance]);    {

      accessorKey: "address",

  return (      header: "Address",

    <div className="container mx-auto py-10">      cell: ({ row }) => (

      <PageHeader heading={supplier.name} text="Supplier transactions and details">        <div className="truncate max-w-[200px]">{row.original.address}</div>

        <div className="flex items-center gap-4">      ),

          <div className="flex items-center gap-2">    },

            <Select    {

              value={storeFilter}      accessorKey: "storeId",

              onValueChange={(value) => setStoreFilter(value)}      header: "Store",

            >      cell: ({ row }) => (

              <SelectTrigger className="w-[180px]">        <Badge variant="outline">{row.original.storeId}</Badge>

                <SelectValue placeholder="Select store" />      ),

              </SelectTrigger>    },

              <SelectContent>    {

                <SelectItem value={TRANSACTION_CONSTANTS.STORE_OPTIONS.ALL}>      accessorKey: "totalDue",

                  All Stores      header: "Total Due",

                </SelectItem>      cell: ({ row }) => (

                <SelectItem value={TRANSACTION_CONSTANTS.STORE_OPTIONS.STORE_1}>        <div

                  Store 1          className={`text-right ${

                </SelectItem>            row.original.totalDue > 0 ? "text-red-500" : "text-green-500"

                <SelectItem value={TRANSACTION_CONSTANTS.STORE_OPTIONS.STORE_2}>          }`}

                  Store 2        >

                </SelectItem>          ৳{(row.original.totalDue || 0).toLocaleString()}

              </SelectContent>        </div>

            </Select>      ),

            <DateRangePicker    },

              date={dateRange}    {

              onChange={setDateRange}      id: "actions",

              align="start"      cell: ({ row }) => (

              className="w-auto"        <div className="flex justify-end">

            />          <DropdownMenu>

          </div>            <DropdownMenuTrigger asChild>

          <AddSupplierTransactionDialog onSubmit={handleAddTransaction} />              <Button

          <Button onClick={handleExportCSV} variant="outline">                variant="ghost"

            <FileDownIcon className="mr-2 h-4 w-4" />                size="sm"

            Export CSV                onClick={(e) => e.stopPropagation()}

          </Button>              >

        </div>                <MoreVertical className="h-4 w-4" />

      </PageHeader>              </Button>

            </DropdownMenuTrigger>

      <div className="mb-6">            <DropdownMenuContent align="end">

        <SummaryCards data={summary} loading={loadingState.action} />              <DropdownMenuItem

      </div>                onClick={(e) => {

                  e.stopPropagation();

      <DataTable                  setEditingSupplier(row.original);

        columns={columns}                }}

        data={supplierTransactionsWithBalance}              >

        progressPending={loadingState.transactions}                Edit

        pagination              </DropdownMenuItem>

      />              <DropdownMenuItem

                onClick={(e) => {

      {editingTransaction && (                  e.stopPropagation();

        <EditSupplierTransactionDialog                  router.push(`/suppliers/${row.original.id}`);

          transaction={editingTransaction}                }}

          onClose={() => setEditingTransaction(null)}              >

          onSubmit={(data) => handleEditTransaction(editingTransaction.id, data)}                View Details

        />              </DropdownMenuItem>

      )}              <AlertDialog>

                <AlertDialogTrigger asChild>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>                  <DropdownMenuItem

        <AlertDialogContent>                    className="text-red-500"

          <AlertDialogHeader>                    onSelect={(e) => e.preventDefault()}

            <AlertDialogTitle>Are you sure?</AlertDialogTitle>                  >

            <AlertDialogDescription>                    Delete

              This will permanently delete this transaction. This action cannot be undone.                  </DropdownMenuItem>

            </AlertDialogDescription>                </AlertDialogTrigger>

          </AlertDialogHeader>                <AlertDialogContent>

          <AlertDialogFooter>                  <AlertDialogHeader>

            <AlertDialogCancel>Cancel</AlertDialogCancel>                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>

            <AlertDialogAction                    <AlertDialogDescription>

              onClick={() => handleDeleteTransaction(deleteTarget?.id)}                      This action cannot be undone. This will permanently delete

              className="bg-red-600 focus:ring-red-600"                      the supplier and all associated data.

            >                    </AlertDialogDescription>

              Delete                  </AlertDialogHeader>

            </AlertDialogAction>                  <AlertDialogFooter>

          </AlertDialogFooter>                    <AlertDialogCancel>Cancel</AlertDialogCancel>

        </AlertDialogContent>                    <AlertDialogAction

      </AlertDialog>                      onClick={() => handleDeleteSupplier(row.original.id)}

    </div>                    >

  );                      Delete

}                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Suppliers"
        description="Manage and track all supplier information"
        actions={
          <>
            <AddSupplierDialog onAddSupplier={handleAddSupplier}>
              <Button
                className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white"
                disabled={loadingState.actions}
                aria-label="Add new supplier"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </AddSupplierDialog>
            <Button
              onClick={handleExportPDF}
              className="w-full md:w-auto"
              variant="outline"
              disabled={loadingState.actions}
              aria-label="Export suppliers list to PDF"
            >
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button
              onClick={handleExportCSV}
              className="w-full md:w-auto"
              variant="outline"
              disabled={loadingState.actions}
              aria-label="Export suppliers list to CSV"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="overflow-hidden border-none shadow-md">
          <CardContent className="p-0">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border-b border-blue-100 dark:border-blue-800">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Total Amount
                </h3>
                <ArrowUpRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                ৳{totals.totalAmount.toLocaleString()}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                All time transactions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <CardContent className="p-0">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 border-b border-green-100 dark:border-green-800">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                  Total Paid
                </h3>
                <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="p-4">
              <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                ৳{totals.paidAmount.toLocaleString()}
              </p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                All time payments
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md">
          <CardContent className="p-0">
            <div
              className={`${
                totals.dueAmount > 0
                  ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
                  : "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800"
              } p-4 border-b`}
            >
              <div className="flex justify-between items-center">
                <h3
                  className={`text-sm font-medium ${
                    totals.dueAmount > 0
                      ? "text-red-800 dark:text-red-300"
                      : "text-green-800 dark:text-green-300"
                  }`}
                >
                  Total Due
                </h3>
                <RefreshCw
                  className={`h-4 w-4 ${
                    totals.dueAmount > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                />
              </div>
            </div>
            <div className="p-4">
              <p
                className={`text-2xl md:text-3xl font-bold ${
                  totals.dueAmount > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                ৳{totals.dueAmount.toLocaleString()}
              </p>
              <p
                className={`text-xs ${
                  totals.dueAmount > 0
                    ? "text-red-600/70 dark:text-red-400/70"
                    : "text-green-600/70 dark:text-green-400/70"
                } mt-1`}
              >
                Current balance
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={filteredSuppliers}
        columns={columns}
        filterColumn="name"
        onRowClick={(row) => router.push(`/suppliers/${row.id}`)}
      />

      {/* Edit Supplier Dialog */}
      {editingSupplier && (
        <EditSupplierDialog
          supplier={editingSupplier}
          isOpen={!!editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onEditSupplier={handleEditSupplier}
        />
      )}
    </div>
  );
}

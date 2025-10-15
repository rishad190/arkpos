"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  ArrowLeft,
  ArrowDownToLine,
  Phone,
  Mail,
  Store,
  DollarSign,
  CreditCard,
  FileText,
  Printer,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { AddSupplierTransactionDialog } from "@/components/AddSupplierTransactionDialog.jsx";
import { formatDate } from "@/lib/utils";
import { EditSupplierTransactionDialog } from "@/components/EditSupplierTransactionDialog.jsx";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToPDF } from "@/lib/utils";

export default function SupplierDetail() {
  const params = useParams();
  const router = useRouter();
  const { suppliers, updateSupplier, deleteSupplierTransaction } = useData();
  const [storeFilter, setStoreFilter] = useState("all");
  const [supplier, setSupplier] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // Format date to DD-MM-YYYY
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Fetch supplier and transactions data
  useEffect(() => {
    const supplierRef = ref(db, `suppliers/${params.id}`);
    const transactionsRef = ref(db, "supplierTransactions");

    const unsubSupplier = onValue(supplierRef, (snapshot) => {
      if (snapshot.exists()) {
        setSupplier({ id: params.id, ...snapshot.val() });
      } else {
        router.push("/suppliers");
      }
    });

    const unsubTransactions = onValue(transactionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const transactionsData = snapshot.val();
        const supplierTransactions = Object.entries(transactionsData)
          .map(([id, data]) => ({ id, ...data }))
          .filter((t) => t.supplierId === params.id)
          .filter((t) => storeFilter === "all" || t.storeId === storeFilter)
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB; // Sort by date ascending (oldest to newest)
          });
        setTransactions(supplierTransactions);
      } else {
        setTransactions([]);
      }
    });

    return () => {
      unsubSupplier();
      unsubTransactions();
    };
  }, [params.id, router, storeFilter]);

  const handleExportCSV = () => {
    const data = transactionsWithBalance.map((t) => ({
      Date: formatDate(t.date),
      Invoice: t.invoiceNumber,
      Details: t.details,
      Total: `${t.totalAmount.toLocaleString()}`,
      Paid: `${t.paidAmount.toLocaleString()}`,
      Due: `${t.due.toLocaleString()}`,
      Balance: `${t.cumulativeBalance.toLocaleString()}`,
      Store: t.storeId,
    }));
    exportToCSV(data, `${supplier?.name}-transactions-${params.id}.csv`);
  };

  const handleAddTransaction = async (transaction) => {
    try {
      const transactionsRef = ref(db, "supplierTransactions");
      const newTransactionRef = push(transactionsRef);
      const newTransaction = {
        ...transaction,
        id: newTransactionRef.key,
        supplierId: params.id,
        createdAt: new Date().toISOString(),
      };

      await update(newTransactionRef, newTransaction);

      // Update supplier's total due
      const newTotalDue =
        (supplier.totalDue || 0) +
        (transaction.totalAmount - (transaction.paidAmount || 0));

      await updateSupplier(params.id, {
        totalDue: newTotalDue,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error adding transaction:", error);
      throw error;
    }
  };

  const handleDeleteTransaction = async (transactionId, amount, paidAmount) => {
    try {
      await deleteSupplierTransaction(
        transactionId,
        params.id,
        amount,
        paidAmount
      );
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction. Please try again.");
    }
  };

  const handleEditTransaction = async (transactionId, updatedData) => {
    try {
      const oldTransaction = transactions.find((t) => t.id === transactionId);
      const oldDue =
        oldTransaction.totalAmount - (oldTransaction.paidAmount || 0);
      const newDue = updatedData.totalAmount - (updatedData.paidAmount || 0);
      const dueDifference = newDue - oldDue;

      // Update transaction
      const transactionRef = ref(db, `supplierTransactions/${transactionId}`);
      await update(transactionRef, updatedData);

      // Update supplier's total due
      await updateSupplier(params.id, {
        totalDue: Math.max(0, (supplier.totalDue || 0) + dueDifference),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating transaction:", error);
      throw error;
    }
  };

  if (!supplier) {
    return <div>Loading...</div>;
  }

  // Update the transactionsWithBalance calculation
  const transactionsWithBalance = transactions.reduce((acc, transaction) => {
    const previousBalance =
      acc.length > 0 ? acc[acc.length - 1].cumulativeBalance : 0;
    const currentDue = transaction.totalAmount - (transaction.paidAmount || 0);
    const currentBalance = previousBalance + currentDue;

    return [
      ...acc,
      {
        ...transaction,
        due: currentDue,
        cumulativeBalance: currentBalance,
      },
    ];
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              Supplier Details
            </h1>
          </div>
          <p className="text-muted-foreground">
            View and manage supplier information and transactions
          </p>
        </div>
      </div>

      {/* Supplier Info and Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Supplier Info Card */}
        <Card className="lg:col-span-1 overflow-hidden border-none shadow-md">
          <CardHeader className="bg-primary text-primary-foreground pb-4">
            <div className="flex justify-between items-start">
              <CardTitle>Supplier Profile</CardTitle>
              <Badge
                variant="secondary"
                className="bg-primary-foreground text-primary"
              >
                ID: {params.id}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center mb-6">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="text-xl">
                  {supplier.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold text-center">
                {supplier.name}
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{supplier.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{supplier.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span>Store ID: {supplier.storeId}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card className="lg:col-span-2 border-none shadow-md">
          <CardHeader className="bg-muted pb-4">
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>
              Overview of suppliers financial status
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-blue-600">
                      Total Amount
                    </span>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    ৳
                    {transactions
                      .reduce((sum, t) => sum + (t.totalAmount || 0), 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-600">
                      Total Paid
                    </span>
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    ৳
                    {transactions
                      .reduce((sum, t) => sum + (t.paidAmount || 0), 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`${
                  supplier.totalDue > 0 ? "bg-red-50" : "bg-green-50"
                } border-none shadow-sm`}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-sm font-medium ${
                        supplier.totalDue > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      Total Due
                    </span>
                    <FileText
                      className={`h-4 w-4 ${
                        supplier.totalDue > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    />
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      supplier.totalDue > 0 ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    ৳{supplier.totalDue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t">
              <select
                className="w-full sm:w-[180px] border rounded-md px-4 py-2"
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
              >
                <option value="all">All Stores</option>
                <option value="STORE1">Store 1</option>
                <option value="STORE2">Store 2</option>
              </select>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() =>
                    exportToPDF(supplier, transactionsWithBalance, "supplier")
                  }
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>

                <AddSupplierTransactionDialog
                  supplierId={params.id}
                  onAddTransaction={handleAddTransaction}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Date</TableHead>
              <TableHead className="whitespace-nowrap">
                Invoice Number
              </TableHead>
              <TableHead className="whitespace-nowrap">Details</TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Total Amount
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Paid Amount
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Due Amount
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                Balance
              </TableHead>
              <TableHead className="whitespace-nowrap">Actions</TableHead>{" "}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactionsWithBalance.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDate(transaction.date)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {transaction.invoiceNumber}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {transaction.details}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  ৳{(transaction.totalAmount || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  ৳{(transaction.paidAmount || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap text-red-500">
                  ৳{(transaction.due || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap text-red-500">
                  ৳{transaction.cumulativeBalance.toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <EditSupplierTransactionDialog
                            transaction={transaction}
                            onSave={handleEditTransaction}
                          />
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-red-500"
                              onSelect={(e) => e.preventDefault()}
                            >
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the transaction.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteTransaction(
                                    transaction.id,
                                    transaction.totalAmount,
                                    transaction.paidAmount
                                  )
                                }
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Update the footer section */}
      <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-sm text-gray-500">
          Total Transactions: {transactionsWithBalance.length}
        </div>
        <div className="bg-gray-100 p-4 rounded-lg w-full md:w-auto">
          <span className="font-semibold">Current Balance: </span>
          <span
            className={`font-bold ${
              supplier.totalDue > 0 ? "text-red-500" : "text-green-500"
            }`}
          >
            ৳{supplier.totalDue.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
"use client";
import { useState } from "react";
import { useLoans } from "@/contexts/loan-context";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Calendar, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddLoanDialog } from "@/components/loans/AddLoanDialog";
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

import { LoanDetailsDialog } from "@/components/loans/LoanDetailsDialog";

export default function LoansPage() {
  const { loans, loading, totals, deleteLoan } = useLoans();
  const [deletingId, setDeletingId] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const handleDelete = async () => {
    if (deletingId) {
      await deleteLoan(deletingId);
      setDeletingId(null);
    }
  };

  if (loading) {
     return <div className="p-8"><Skeleton className="h-12 w-48 mb-6" /><Skeleton className="h-64 w-full" /></div>;
  }

  // Calculate Net Position
  // Assets (Given) - Liabilities (Taken)
  const netBalance = totals.givenBalance - totals.takenBalance;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Loan Management"
        description="Track loans given and taken, logging exactly what you receive and pay."
        actions={
          <AddLoanDialog>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Loan Account
            </Button>
          </AddLoanDialog>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Loans Given (Assets) */}
        <Card className="bg-green-50/50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Money Given (Assets)</CardTitle>
            <CardDescription>Remaining Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totals.givenBalance)}</div>
            <p className="text-xs text-green-600 mt-1">
              Total Out: {formatCurrency(totals.givenTotal)} | Repaid: {formatCurrency(totals.givenRepaid)}
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Profit Received: {formatCurrency(totals.givenProfit)}
            </p>
          </CardContent>
        </Card>

        {/* Loans Taken (Liabilities) */}
        <Card className="bg-red-50/50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Money Taken (Liabilities)</CardTitle>
            <CardDescription>Remaining Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(totals.takenBalance)}</div>
            <p className="text-xs text-red-600 mt-1">
              Total In: {formatCurrency(totals.takenTotal)} | Repaid: {formatCurrency(totals.takenRepaid)}
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Profit Paid: {formatCurrency(totals.takenProfit)}
            </p>
          </CardContent>
        </Card>

        {/* Net Position */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Position</CardTitle>
            <CardDescription>Given Balance - Taken Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {netBalance >= 0 ? "+" : ""}{formatCurrency(netBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loan List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Loans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Total Taken</TableHead>
                <TableHead className="text-right">Repaid</TableHead>
                <TableHead className="text-right">Profit Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No loans found. Click "Add Loan Account" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                loans.map((loan) => (
                  <TableRow 
                     key={loan.id} 
                     className="cursor-pointer hover:bg-muted/50"
                     onClick={() => setSelectedLoan(loan)}
                  >
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium">{formatDate(loan.startDate)}</span>
                             <span className="text-xs text-muted-foreground">{loan.daysElapsed} days</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={loan.type === 'GIVEN' ? "default" : "destructive"} className={loan.type === 'GIVEN' ? "bg-green-600" : ""}>
                        {loan.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground text-sm">
                      {loan.sourceType?.toLowerCase() || 'Person'}
                    </TableCell>
                    <TableCell className="font-medium">{loan.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(loan.totalTaken)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(loan.totalRepaid)}</TableCell>
                    <TableCell className="text-right text-orange-600">
                        {formatCurrency(loan.totalProfit)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                        {formatCurrency(loan.balance)}
                    </TableCell>
                    <TableCell>
                      <AlertDialog open={deletingId === loan.id} onOpenChange={(open) => !open && setDeletingId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(loan.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={e => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Loan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this loan record. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <LoanDetailsDialog 
        loan={selectedLoan} 
        open={!!selectedLoan} 
        onOpenChange={(open) => !open && setSelectedLoan(null)} 
      />
    </div>
  );
}

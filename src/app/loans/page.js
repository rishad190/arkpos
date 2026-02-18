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

export default function LoansPage() {
  const { loans, loading, totals, deleteLoan } = useLoans();
  const [deletingId, setDeletingId] = useState(null);

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
  // If Positive: You are owed money. If Negative: You owe money.
  const netPrincipal = totals.givenPrincipal - totals.takenPrincipal;
  const netTotal = totals.givenTotal - totals.takenTotal;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Loan Management"
        description="Track loans given and taken with automatic interest calculation."
        actions={
          <AddLoanDialog>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Loan
            </Button>
          </AddLoanDialog>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Loans Given (Assets) */}
        <Card className="bg-green-50/50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Total Loans Given</CardTitle>
            <CardDescription>Principal + Interest</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totals.givenTotal)}</div>
            <p className="text-xs text-green-600 mt-1">
              Principal: {formatCurrency(totals.givenPrincipal)} | Interest: {formatCurrency(totals.givenInterest)}
            </p>
          </CardContent>
        </Card>

        {/* Loans Taken (Liabilities) */}
        <Card className="bg-red-50/50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Total Loans Taken</CardTitle>
            <CardDescription>Principal + Interest</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(totals.takenTotal)}</div>
            <p className="text-xs text-red-600 mt-1">
              Principal: {formatCurrency(totals.takenPrincipal)} | Interest: {formatCurrency(totals.takenInterest)}
            </p>
          </CardContent>
        </Card>

        {/* Net Position */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Position</CardTitle>
            <CardDescription>Receivable - Payable</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
              {netTotal >= 0 ? "+" : ""}{formatCurrency(netTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net Principal: {formatCurrency(netPrincipal)}
            </p>
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
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-center">Rate</TableHead>
                <TableHead className="text-right">Interest (Accrued)</TableHead>
                <TableHead className="text-right">Total Due</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No loans found. Click "Add Loan" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium">{formatDate(loan.startDate)}</span>
                            {loan.endDate ? (
                               <span className="text-xs text-muted-foreground">to {formatDate(loan.endDate)}</span>
                            ) : (
                               <span className="text-xs text-muted-foreground">{loan.daysElapsed} days ago</span>
                            )}
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={loan.type === 'GIVEN' ? "default" : "destructive"} className={loan.type === 'GIVEN' ? "bg-green-600" : ""}>
                        {loan.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{loan.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(loan.principal)}</TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      {loan.rate}% <span className="text-xs text-muted-foreground">/{loan.rateType === 'MONTHLY' ? 'mo' : 'yr'}</span>
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                        +{formatCurrency(loan.calculatedInterest)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                        {formatCurrency(loan.totalDue)}
                    </TableCell>
                    <TableCell>
                      <AlertDialog open={deletingId === loan.id} onOpenChange={(open) => !open && setDeletingId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingId(loan.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
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
    </div>
  );
}

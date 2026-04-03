"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLoans } from "@/contexts/loan-context";

export function LoanDetailsDialog({ loan, open, onOpenChange }) {
  const { addLoanTransaction } = useLoans(); // Note: Wait, I need to add this method to loan-context!
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'PRINCIPAL', // PRINCIPAL or PROFIT
    action: 'TAKE_MORE', // TAKE_MORE or REPAY. This is purely for UI, mapped to positive/negative amount
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: ""
  });

  if (!loan) return null;

  // Process transactions for display
  const transactionsList = loan.transactions 
    ? Object.entries(loan.transactions).map(([id, t]) => ({ id, ...t })).sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return;
    
    setLoading(true);
    try {
      let finalAmount = Number(formData.amount);
      // Logic:
      // If Principal Repayment -> negative amount
      // If Profit -> always positive tracked
      if (formData.type === 'PRINCIPAL' && formData.action === 'REPAY') {
        finalAmount = -Math.abs(finalAmount);
      } else {
        finalAmount = Math.abs(finalAmount);
      }

      // We need `addLoanTransaction` exposed from Context
      if (addLoanTransaction) {
        await addLoanTransaction(loan.id, {
            type: formData.type,
            amount: finalAmount,
            date: formData.date,
            note: formData.note
        });
      } else {
        alert("Transaction saving not fully linked yet!");
      }
      
      setShowAddForm(false);
      setFormData({
        type: 'PRINCIPAL',
        action: 'TAKE_MORE',
        amount: "",
        date: new Date().toISOString().split("T")[0],
        note: ""
      });
    } catch (err) {
      console.error(err);
      alert("Error saving transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if(!val) setShowAddForm(false);
        onOpenChange(val);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                {loan.name} 
                <Badge variant={loan.type === 'GIVEN' ? "default" : "destructive"} className={loan.type === 'GIVEN' ? "bg-green-600" : ""}>
                    {loan.type}
                </Badge>
                </DialogTitle>
                <div className="text-sm text-muted-foreground mt-1 capitalize">
                    Source: {loan.sourceType?.toLowerCase() || 'Person'} | Started: {formatDate(loan.startDate)}
                </div>
            </div>
            {!showAddForm && (
                <Button onClick={() => setShowAddForm(true)} size="sm">Log Activity</Button>
            )}
          </div>
        </DialogHeader>

        {showAddForm && (
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4">
                    <form onSubmit={handleAddTransaction} className="flex gap-4 items-end flex-wrap">
                        <div className="space-y-2 flex-1 min-w-[120px]">
                            <Label>Category</Label>
                            <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PRINCIPAL">Principal</SelectItem>
                                    <SelectItem value="PROFIT">Profit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {formData.type === 'PRINCIPAL' && (
                            <div className="space-y-2 flex-1 min-w-[120px]">
                                <Label>Action</Label>
                                <Select value={formData.action} onValueChange={(v) => setFormData({...formData, action: v})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TAKE_MORE">Gain/Give More</SelectItem>
                                        <SelectItem value="REPAY">Repay/Get Paid Back</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2 flex-1 min-w-[100px]">
                            <Label>Amount</Label>
                            <Input type="number" min="0.01" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                        </div>
                        <div className="space-y-2 flex-1 min-w-[140px]">
                            <Label>Date</Label>
                            <Input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div className="space-y-2 flex-[2] min-w-[200px]">
                            <Label>Note (Opt)</Label>
                            <Input type="text" placeholder="Details..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>{loading ? "Saving" : "Save"}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        )}

        <div className="grid grid-cols-4 gap-4 py-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <div className="text-xs text-muted-foreground uppercase mb-1">Total {loan.type === 'GIVEN' ? "Given" : "Taken"}</div>
            <div className="font-bold text-lg">{formatCurrency(loan.totalTaken)}</div>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <div className="text-xs text-muted-foreground uppercase mb-1">Total Repaid</div>
            <div className="font-bold text-lg">{formatCurrency(loan.totalRepaid)}</div>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <div className="text-xs text-orange-600/80 uppercase mb-1">Profit Paid</div>
            <div className="font-bold text-lg text-orange-600">{formatCurrency(loan.totalProfit)}</div>
          </div>
          <div className="p-4 border-2 border-primary/20 bg-primary/5 rounded-lg text-center">
            <div className="text-xs text-primary/80 font-bold uppercase mb-1">Remaining Balance</div>
            <div className="font-bold text-xl text-primary">{formatCurrency(loan.balance)}</div>
          </div>
        </div>

        <div>
            <h4 className="font-semibold mb-2">Ledger History</h4>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Render Initial Load */}
                        <TableRow className="bg-muted/20">
                            <TableCell>{formatDate(loan.startDate)}</TableCell>
                            <TableCell>
                                <span className="font-medium text-xs rounded bg-gray-200 px-2 py-0.5">INITIAL BALANCE</span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">Account Created</TableCell>
                            <TableCell className="text-right text-gray-700">+{formatCurrency(Number(loan.principal) || 0)}</TableCell>
                        </TableRow>
                        {transactionsList.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground">No additional transactions</TableCell>
                            </TableRow>
                        )}
                        {transactionsList.map(t => {
                            const isProfit = t.type === 'PROFIT';
                            const isRepay = t.type === 'PRINCIPAL' && t.amount < 0;
                            const isExtraTake = t.type === 'PRINCIPAL' && t.amount > 0;
                            
                            return (
                            <TableRow key={t.id}>
                                <TableCell>{formatDate(t.date || t.createdAt)}</TableCell>
                                <TableCell>
                                    {isProfit && <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">PROFIT</Badge>}
                                    {isRepay && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">REPAYMENT</Badge>}
                                    {isExtraTake && <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">ADDED PRINCIPAL</Badge>}
                                    {!isProfit && !isRepay && !isExtraTake && <Badge variant="outline">OTHER</Badge>}
                                </TableCell>
                                <TableCell className="text-sm">{t.note || '-'}</TableCell>
                                <TableCell className={`text-right font-medium ${isRepay ? 'text-green-600' : 'text-foreground'}`}>
                                    {isRepay || isProfit ? '' : '+'}{formatCurrency(Math.abs(t.amount || 0))}
                                </TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

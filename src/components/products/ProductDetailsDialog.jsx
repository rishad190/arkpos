import { Trash2, Edit2, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useProducts } from "@/contexts/product-context";

export function ProductDetailsDialog({ product, open, onOpenChange }) {
  const { addProductTransaction, updateProductTransaction, deleteProductTransaction } = useProducts(); 
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'INVESTMENT', 
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: ""
  });

  if (!product) return null;

  // Process transactions for display
  const transactionsList = product.transactions 
    ? Object.entries(product.transactions).map(([id, t]) => ({ id, ...t })).sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  const cancelForm = () => {
    setShowAddForm(false);
    setEditId(null);
    setFormData({
      type: 'INVESTMENT',
      amount: "",
      date: new Date().toISOString().split("T")[0],
      note: ""
    });
  };

  const handleStartEdit = (t) => {
    setEditId(t.id);
    setShowAddForm(true);
    setFormData({
      type: t.type,
      amount: Math.abs(t.amount).toString(),
      date: t.date || new Date().toISOString().split("T")[0],
      note: t.note || ""
    });
  };

  const handleDelete = async (tId) => {
     if (confirm("Are you sure you want to delete this transaction?")) {
         try {
             if (deleteProductTransaction) {
                 await deleteProductTransaction(product.id, tId);
             } else {
                 alert("Delete not fully linked yet");
             }
         } catch (error) {
             console.error(error);
             alert("Error deleting transaction");
         }
     }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return;
    
    setLoading(true);
    try {
      let finalAmount = Math.abs(Number(formData.amount)); // Keep strictly positive, logic handled via type

      if (editId) {
          if (updateProductTransaction) {
              await updateProductTransaction(product.id, editId, {
                  type: formData.type,
                  amount: finalAmount,
                  date: formData.date,
                  note: formData.note
              });
          }
      } else {
          if (addProductTransaction) {
            await addProductTransaction(product.id, {
                type: formData.type,
                amount: finalAmount,
                date: formData.date,
                note: formData.note
            });
          } else {
            alert("Transaction saving not fully linked yet!");
          }
      }
      
      cancelForm();
    } catch (err) {
      console.error(err);
      alert("Error saving transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if(!val) cancelForm();
        onOpenChange(val);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                {product.name} 
                <Badge variant={product.netROI >= 0 ? "default" : "destructive"} className={product.netROI >= 0 ? "bg-green-600" : ""}>
                    {product.netROI >= 0 ? "PROFITABLE" : "LOSS"}
                </Badge>
                </DialogTitle>
                <div className="text-sm text-muted-foreground mt-1 capitalize">
                    Started: {formatDate(product.startDate)} ({product.daysElapsed} days ago)
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
                                    <SelectItem value="INVESTMENT">Investment/Expense</SelectItem>
                                    <SelectItem value="RETURN">Return/Income</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
                            <Button type="button" variant="ghost" onClick={cancelForm}>Cancel</Button>
                            <Button type="submit" disabled={loading}>{loading ? "Saving" : (editId ? "Update" : "Save")}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        )}

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <div className="text-xs text-muted-foreground uppercase mb-1">Total Invested</div>
            <div className="font-bold text-lg text-destructive">{formatCurrency(product.totalInvested)}</div>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <div className="text-xs text-muted-foreground uppercase mb-1">Total Returns</div>
            <div className="font-bold text-lg text-green-600">{formatCurrency(product.totalReturned)}</div>
          </div>
          <div className="p-4 border-2 border-primary/20 bg-primary/5 rounded-lg text-center">
            <div className="text-xs text-primary/80 font-bold uppercase mb-1">Net ROI</div>
            <div className={`font-bold text-xl ${product.netROI < 0 ? 'text-destructive' : 'text-primary'}`}>
                {product.netROI > 0 ? '+' : ''}{formatCurrency(product.netROI)}
            </div>
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
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Render Initial Load */}
                        <TableRow className="bg-muted/20">
                            <TableCell>{formatDate(product.startDate)}</TableCell>
                            <TableCell>
                                <span className="font-medium text-xs rounded bg-gray-200 px-2 py-0.5">INITIAL BALANCE</span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">Account Created</TableCell>
                            <TableCell className="text-right text-destructive">-{formatCurrency(Number(product.initialInvestment) || 0)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        {transactionsList.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4 text-xs text-muted-foreground">No additional transactions</TableCell>
                            </TableRow>
                        )}
                        {transactionsList.map(t => {
                            const isInvestment = t.type === 'INVESTMENT';
                            const isReturn = t.type === 'RETURN';
                            
                            return (
                            <TableRow key={t.id}>
                                <TableCell>{formatDate(t.date || t.createdAt)}</TableCell>
                                <TableCell>
                                    {isInvestment && <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">INVESTMENT</Badge>}
                                    {isReturn && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">RETURN</Badge>}
                                </TableCell>
                                <TableCell className="text-sm">{t.note || '-'}</TableCell>
                                <TableCell className={`text-right font-medium ${isReturn ? 'text-green-600' : 'text-destructive'}`}>
                                    {isReturn ? '+' : '-'}{formatCurrency(Math.abs(t.amount || 0))}
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleStartEdit(t)}>
                                                    <Edit2 className="h-4 w-4 mr-2 text-muted-foreground" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(t.id)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
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

"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProducts } from "@/contexts/product-context";
import { useCustomers } from "@/contexts/customer-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, MoreHorizontal, ArrowLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { products, loading, deleteProductTransaction, updateProductTransaction, addProductTransaction } = useProducts();
  const { customers } = useCustomers();
  const [product, setProduct] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: 'PRODUCT_COST', 
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
    partnerName: "",
    soldQuantity: "",
    soldColor: "",
    soldToCustomer: ""
  });

  useEffect(() => {
    if (!loading && products.length > 0) {
      const foundProduct = products.find((p) => p.id === params.id);
      if (foundProduct) {
        setProduct(foundProduct);
      } else {
        router.push("/products");
      }
    }
  }, [loading, products, params.id, router]);

  if (loading || !product) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const transactionsList = product.transactions 
    ? Object.entries(product.transactions).map(([id, t]) => ({ id, ...t })).sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  const cancelForm = () => {
    setShowAddForm(false);
    setEditId(null);
    setFormData({
      type: 'PRODUCT_COST',
      amount: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
      partnerName: "",
      soldQuantity: "",
      soldColor: "",
      soldToCustomer: ""
    });
  };

  const handleStartEdit = (t) => {
    setEditId(t.id);
    setShowAddForm(true);
    setFormData({
      type: t.type,
      amount: Math.abs(t.amount).toString(),
      date: t.date || new Date().toISOString().split("T")[0],
      note: t.note || "",
      partnerName: t.partnerName || "",
      soldQuantity: t.soldQuantity || "",
      soldColor: t.soldColor || "",
      soldToCustomer: t.soldToCustomer || ""
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
    
    setSaving(true);
    try {
      let finalAmount = Math.abs(Number(formData.amount));

      const payload = {
          type: formData.type,
          amount: finalAmount,
          date: formData.date,
          note: formData.note,
          partnerName: formData.partnerName,
          ...(formData.type === 'PRODUCT_SALE' && {
             soldQuantity: formData.soldQuantity || "",
             soldColor: formData.soldColor || "",
             soldToCustomer: formData.soldToCustomer || ""
          })
      };

      if (editId) {
          if (updateProductTransaction) {
              await updateProductTransaction(product.id, editId, payload);
          }
      } else {
          if (addProductTransaction) {
            await addProductTransaction(product.id, payload);
          } else {
            alert("Transaction saving not fully linked yet!");
          }
      }
      
      cancelForm();
    } catch (err) {
      console.error(err);
      alert("Error saving transaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push("/products")}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
                <h1 className="text-2xl font-bold flex flex-wrap items-center gap-3">
                    {product.name}
                    <Badge variant={product.netProfit >= 0 ? "default" : "destructive"} className={product.netProfit >= 0 ? "bg-green-600" : ""}>
                        {product.netProfit >= 0 ? "PROFITABLE" : "LOSS"}
                    </Badge>
                    {product.quantity && (
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            Qty: {product.quantity}
                        </Badge>
                    )}
                    {product.color && (
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            Color: {product.color}
                        </Badge>
                    )}
                </h1>
                <div className="text-muted-foreground mt-1 text-sm flex items-center flex-wrap gap-2">
                     <span>Started: {formatDate(product.startDate)} ({product.daysElapsed} days ago)</span>
                     {(product.details || product.notes) && <span className="text-muted-foreground/50">•</span>}
                     {product.details && <span className="font-medium text-foreground/80">{product.details}</span>}
                     {product.details && product.notes && <span className="text-muted-foreground/50">-</span>}
                     {product.notes && <span className="italic">{product.notes}</span>}
                </div>
            </div>
            {!showAddForm && (
                <Button onClick={() => setShowAddForm(true)} className="w-full sm:w-auto">Log Activity</Button>
            )}
        </div>

        {showAddForm && (
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-6 overflow-x-auto">
                    <form onSubmit={handleAddTransaction} className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end flex-wrap min-w-full">
                        <div className="space-y-2 flex-1 min-w-[120px]">
                            <Label>Category</Label>
                            <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v, partnerName: ""})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PRODUCT_COST">Product Cost</SelectItem>
                                    <SelectItem value="OTHER_EXPENSE">Other Expense</SelectItem>
                                    <SelectItem value="PARTNER_INVESTMENT">Partner Investment</SelectItem>
                                    <SelectItem value="PRODUCT_SALE">Product Sale</SelectItem>
                                    <SelectItem value="PARTNER_PAYOUT">Partner Payout</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {formData.type === 'PARTNER_INVESTMENT' && (
                          <div className="space-y-2 flex-1 min-w-[120px]">
                              <Label>Partner</Label>
                              <Input 
                                type="text" 
                                required 
                                list="partner-names-list"
                                placeholder="Name..." 
                                value={formData.partnerName} 
                                onChange={e => setFormData({...formData, partnerName: e.target.value})} 
                              />
                              <datalist id="partner-names-list">
                                {Object.keys(product?.partners || {}).map(name => (
                                    <option key={name} value={name} />
                                ))}
                              </datalist>
                          </div>
                        )}
                        {formData.type === 'PARTNER_PAYOUT' && (
                          <div className="space-y-2 flex-1 min-w-[120px]">
                              <Label>Select Partner</Label>
                              <Select value={formData.partnerName} onValueChange={(v) => setFormData({...formData, partnerName: v})} required>
                                  <SelectTrigger><SelectValue placeholder="Choose partner..." /></SelectTrigger>
                                  <SelectContent>
                                      {Object.keys(product?.partners || {}).length === 0 && <SelectItem value="none" disabled>No active partners</SelectItem>}
                                      {Object.keys(product?.partners || {}).map(name => (
                                          <SelectItem key={name} value={name}>{name}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          </div>
                        )}
                        {formData.type === 'PRODUCT_SALE' && (
                          <>
                            <div className="space-y-2 flex-1 min-w-[100px]">
                                <Label>Sold Qty (Opt)</Label>
                                <Input type="text" placeholder="e.g. 50" value={formData.soldQuantity} onChange={e => setFormData({...formData, soldQuantity: e.target.value})} />
                            </div>
                            <div className="space-y-2 flex-1 min-w-[100px]">
                                <Label>Color (Opt)</Label>
                                <Input type="text" placeholder="e.g. Red" value={formData.soldColor} onChange={e => setFormData({...formData, soldColor: e.target.value})} />
                            </div>
                            <div className="space-y-2 flex-1 min-w-[120px]">
                                <Label>Sold To</Label>
                                <Select 
                                  value={formData.soldToCustomer || "none"} 
                                  onValueChange={(v) => setFormData({...formData, soldToCustomer: v === "none" ? "" : v})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select customer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Customer</SelectItem>
                                        {customers?.map(c => (
                                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                          </>
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
                        <div className="flex gap-2 w-full sm:w-auto justify-end mt-2">
                            <Button type="button" variant="ghost" onClick={cancelForm}>Cancel</Button>
                            <Button type="submit" disabled={saving}>{saving ? "Saving" : (editId ? "Update" : "Save")}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        )}

        {product.quantity && (
            <div>
                <h2 className="text-lg font-semibold mb-3">Inventory Tracking</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-muted/50 border-none shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Starting Qty</div>
                            <div className="text-2xl font-bold text-foreground">{product.quantity}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-muted/50 border-none shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Sold</div>
                            <div className="text-2xl font-bold text-green-600">{product.totalSoldQuantity || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border border-primary/20 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-medium text-primary/80 uppercase tracking-wider mb-1">Remaining Qty</div>
                            <div className="text-3xl font-black text-primary">
                                {product.remainingQuantity !== null ? product.remainingQuantity : (product.quantity || 0)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-muted border-none">
            <CardContent className="p-6 text-center">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Expenses</div>
                <div className="text-3xl font-bold text-destructive">{formatCurrency(product.totalCost)}</div>
            </CardContent>
          </Card>
          <Card className="bg-muted border-none">
            <CardContent className="p-6 text-center">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Sales</div>
                <div className="text-3xl font-bold text-green-600">{formatCurrency(product.totalSales)}</div>
            </CardContent>
          </Card>
          <Card className="bg-muted border-none border border-blue-500/20 bg-blue-50">
            <CardContent className="p-6 text-center">
                <div className="text-sm font-medium text-blue-700 uppercase tracking-wider mb-2">Partner Capital</div>
                <div className="text-3xl font-bold text-blue-700">{formatCurrency(product.totalPartnerInvestment)}</div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border border-primary/20">
            <CardContent className="p-6 text-center">
                <div className="text-sm font-bold text-primary/80 uppercase tracking-wider mb-2">Net Profit</div>
                <div className={`text-4xl font-black ${product.netProfit < 0 ? 'text-destructive' : 'text-primary'}`}>
                    {product.netProfit > 0 ? '+' : ''}{formatCurrency(product.netProfit)}
                </div>
            </CardContent>
          </Card>
        </div>

        {Object.keys(product.partners || {}).length > 0 && (
            <div>
                <h2 className="text-lg font-semibold mb-3">Partner Share & Balances</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(product.partners).map(([name, data]) => (
                        <Card key={name} className="shadow-sm">
                            <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <span className="font-semibold text-lg">{name}</span>
                                    <Badge variant={data.balance > 0 ? "default" : "secondary"} className={data.balance > 0 ? "bg-orange-500 hover:bg-orange-600" : ""}>
                                        {data.balance > 0 ? "OWED" : "SETTLED"}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 text-sm gap-2 mt-2">
                                    <div className="text-muted-foreground">Invested:</div>
                                    <div className="text-right font-medium">{formatCurrency(data.invested)}</div>
                                    
                                    <div className="text-muted-foreground">Paid Back:</div>
                                    <div className="text-right font-medium text-green-600">{formatCurrency(data.payout)}</div>
                                    
                                    <div className="col-span-2 border-t pt-2 mt-1 flex justify-between items-center text-base font-bold">
                                        <span>Current Balance To Pay:</span>
                                        <span className={data.balance > 0 ? "text-destructive" : ""}>{formatCurrency(data.balance)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )}

        <Card className="overflow-hidden">
            <CardContent className="p-0 overflow-x-auto whitespace-nowrap">
                <Table className="min-w-[600px]">
                    <TableHeader className="bg-muted/50 rounded-t-lg">
                        <TableRow>
                            <TableHead className="pl-6">Date</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="pr-6 w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="bg-muted/10">
                            <TableCell className="pl-6">{formatDate(product.startDate)}</TableCell>
                            <TableCell>
                                <span className="font-semibold text-[10px] rounded bg-gray-200 px-2 py-1 tracking-wider">INITIAL BALANCE</span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">Account Created</TableCell>
                            <TableCell className="text-right text-destructive font-medium">-{formatCurrency(Number(product.initialInvestment) || 0)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        {transactionsList.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No additional transactions</TableCell>
                            </TableRow>
                        )}
                        {transactionsList.map(t => {
                            const isOutflow = t.type === 'PRODUCT_COST' || t.type === 'OTHER_EXPENSE' || t.type === 'PARTNER_PAYOUT' || t.type === 'INVESTMENT';
                            
                            return (
                            <TableRow key={t.id}>
                                <TableCell className="pl-6">{formatDate(t.date || t.createdAt)}</TableCell>
                                <TableCell>
                                    {t.type === 'PRODUCT_COST' && <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 uppercase text-[10px] font-bold tracking-wider">Product Cost</Badge>}
                                    {t.type === 'OTHER_EXPENSE' && <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 uppercase text-[10px] font-bold tracking-wider">Other Expense</Badge>}
                                    {t.type === 'PARTNER_INVESTMENT' && <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 uppercase text-[10px] font-bold tracking-wider">Inv: {t.partnerName}</Badge>}
                                    {t.type === 'PRODUCT_SALE' && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 uppercase text-[10px] font-bold tracking-wider">Sale</Badge>}
                                    {t.type === 'PARTNER_PAYOUT' && <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 uppercase text-[10px] font-bold tracking-wider">Pay: {t.partnerName}</Badge>}
                                    {t.type === 'INVESTMENT' && <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 uppercase text-[10px] font-bold tracking-wider">Legacy Cost</Badge>}
                                    {t.type === 'RETURN' && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 uppercase text-[10px] font-bold tracking-wider">Legacy Sale</Badge>}
                                </TableCell>
                                <TableCell className="text-sm">
                                    <div>{t.note || '-'}</div>
                                    {t.type === 'PRODUCT_SALE' && (t.soldQuantity || t.soldColor || t.soldToCustomer) && (
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {t.soldQuantity && <Badge variant="secondary" className="text-[10px] bg-muted/50">Qty: {t.soldQuantity}</Badge>}
                                            {t.soldColor && <Badge variant="secondary" className="text-[10px] bg-muted/50">Color: {t.soldColor}</Badge>}
                                            {t.soldToCustomer && <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">To: {t.soldToCustomer}</Badge>}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className={`text-right font-medium ${isOutflow ? 'text-destructive' : 'text-green-600'}`}>
                                    {isOutflow ? '-' : '+'}{formatCurrency(Math.abs(t.amount || 0))}
                                </TableCell>
                                <TableCell className="pr-6">
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
            </CardContent>
        </Card>
    </div>
  );
}

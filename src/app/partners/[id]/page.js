"use client";
import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useInventory } from "@/contexts/inventory-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, MoreVertical, Edit, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function PartnerAccounts({ product }) {
  const { 
    addPartnerToProduct, 
    addTransactionToPartner,
    updatePartnerName,
    deletePartner,
    updatePartnerTransaction,
    deletePartnerTransaction,
  } = useInventory();

  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [partnerModalStep, setPartnerModalStep] = useState(1);
  const [numPartners, setNumPartners] = useState("");
  const [tempPartnerNames, setTempPartnerNames] = useState([]);

  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [transactionData, setTransactionData] = useState({ date: "", partnerName: "", details: "", amount: "" });

  const [editingPartner, setEditingPartner] = useState(null);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [deletingPartner, setDeletingPartner] = useState(null);

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingTransaction, setDeletingTransaction] = useState(null);

  const partners = product.partnerAccounts || [];

  const handleNumPartnersSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(numPartners, 10);
    if (num > 0) {
      setTempPartnerNames(Array(num).fill(""));
      setPartnerModalStep(2);
    }
  };

  const handlePartnerNamesSubmit = async (e) => {
    e.preventDefault();
    const newPartnerNames = tempPartnerNames.filter((name) => name.trim() !== "");
    if (newPartnerNames.length === 0) {
      setIsAddPartnerOpen(false);
      return;
    }
    await Promise.all(newPartnerNames.map(name => addPartnerToProduct(product.id, name)));
    setIsAddPartnerOpen(false);
    setPartnerModalStep(1);
    setNumPartners("");
    setTempPartnerNames([]);
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    const { partnerName, date, details, amount } = transactionData;
    if (!partnerName || !date || !details || !amount) {
      alert("Please fill all transaction fields.");
      return;
    }
    const newTransactionData = { date, details, amount: parseFloat(amount) };
    await addTransactionToPartner(product.id, partnerName, newTransactionData);
    setIsAddTransactionOpen(false);
    setTransactionData({ date: "", partnerName: "", details: "", amount: "" });
  };

  const handleEditPartner = (partner) => {
    setEditingPartner(partner);
    setNewPartnerName(partner.name);
  };

  const handleUpdatePartnerName = async (e) => {
    e.preventDefault();
    if (!editingPartner || !newPartnerName.trim()) return;
    await updatePartnerName(product.id, editingPartner.name, newPartnerName);
    setEditingPartner(null);
    setNewPartnerName("");
  };

  const handleDeletePartner = async () => {
    if (!deletingPartner) return;
    await deletePartner(product.id, deletingPartner.name);
    setDeletingPartner(null);
  };

  const handleEditTransaction = (tx, partnerName) => {
    setEditingTransaction({ ...tx, partnerName });
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const { id, partnerName, ...dataToUpdate } = editingTransaction;
    dataToUpdate.amount = parseFloat(dataToUpdate.amount);
    await updatePartnerTransaction(product.id, partnerName, id, dataToUpdate);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;
    await deletePartnerTransaction(product.id, deletingTransaction.partnerName, deletingTransaction.id);
    setDeletingTransaction(null);
  };

  const partnerTotals = useMemo(() => {
    return partners.map((partner) => ({
      ...partner,
      total: (partner.transactions || []).reduce((sum, tx) => sum + tx.amount, 0),
    }));
  }, [partners]);

  const grandTotal = useMemo(() => {
    return partnerTotals.reduce((sum, p) => sum + p.total, 0);
  }, [partnerTotals]);

  return (
    <div className="mt-8">
      <PageHeader title="Partner Accounts" description="Manage financial transactions for this product import." />
      <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4 mt-6">
        <div className="flex gap-4">
          <Dialog open={isAddPartnerOpen} onOpenChange={setIsAddPartnerOpen}>
            <Button onClick={() => setIsAddPartnerOpen(true)}>Add Partners</Button>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Partners</DialogTitle></DialogHeader>
              {partnerModalStep === 1 ? (
                <form onSubmit={handleNumPartnersSubmit} className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="numPartners">How many partners?</Label>
                    <Input id="numPartners" type="number" value={numPartners} onChange={(e) => setNumPartners(e.target.value)} min="1" required />
                  </div>
                  <DialogFooter><Button type="submit">Next</Button></DialogFooter>
                </form>
              ) : (
                <form onSubmit={handlePartnerNamesSubmit} className="space-y-4 py-4">
                  {tempPartnerNames.map((_, index) => (
                    <div key={index}>
                      <Label htmlFor={`partnerName-${index}`}>{`Partner ${index + 1} Name`}</Label>
                      <Input id={`partnerName-${index}`} value={tempPartnerNames[index]} onChange={(e) => { const newNames = [...tempPartnerNames]; newNames[index] = e.target.value; setTempPartnerNames(newNames); }} required />
                    </div>
                  ))}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setPartnerModalStep(1)}>Back</Button>
                    <Button type="submit">Create Partners</Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
          {partners.length > 0 && (
            <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
              <Button onClick={() => setIsAddTransactionOpen(true)} variant="secondary">Add Transaction</Button>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
                <form onSubmit={handleTransactionSubmit} className="space-y-4 py-4">
                  {/* Transaction form fields */}
                  <Label>Date</Label><Input type="date" value={transactionData.date} onChange={e => setTransactionData({...transactionData, date: e.target.value})} required />
                  <Label>Partner</Label><Select onValueChange={value => setTransactionData({...transactionData, partnerName: value})} required><SelectTrigger><SelectValue placeholder="Select a partner" /></SelectTrigger><SelectContent>{partners.map(p=><SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select>
                  <Label>Details</Label><Input value={transactionData.details} onChange={e => setTransactionData({...transactionData, details: e.target.value})} required />
                  <Label>Amount</Label><Input type="number" value={transactionData.amount} onChange={e => setTransactionData({...transactionData, amount: e.target.value})} required />
                  <DialogFooter><Button type="submit">Save Transaction</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {partners.length > 0 && (
          <Card><CardHeader className="p-4"><CardTitle>Grand Total</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{grandTotal.toLocaleString(undefined, { style: "currency", currency: "BDT" })}</p></CardContent></Card>
        )}
      </div>
      {partners.length === 0 && <Card className="mt-8"><CardContent className="p-8 text-center text-muted-foreground">No partners added yet. Click "Add Partners" to get started.</CardContent></Card>}
      <div className="space-y-8 mt-8">
        {partnerTotals.map((partner) => (
          <Card key={partner.name}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{partner.name}</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleEditPartner(partner)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDeletingPartner(partner)} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead className="w-[150px]">Date</TableHead><TableHead>Details</TableHead><TableHead className="text-right w-[150px]">Amount</TableHead><TableHead className="w-[100px] text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(partner.transactions || []).length > 0 ? (
                    partner.transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                        <TableCell>{tx.details}</TableCell>
                        <TableCell className="text-right">{tx.amount.toLocaleString(undefined, { style: "currency", currency: "BDT" })}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleEditTransaction(tx, partner.name)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setDeletingTransaction({ ...tx, partnerName: partner.name })} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No transactions yet.</TableCell></TableRow>
                  )}
                </TableBody>
                <TableFooter><TableRow><TableCell colSpan={3} className="font-bold">Total</TableCell><TableCell className="text-right font-bold">{partner.total.toLocaleString(undefined, { style: "currency", currency: "BDT" })}</TableCell></TableRow></TableFooter>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Edit Partner Dialog */}
      <Dialog open={!!editingPartner} onOpenChange={() => setEditingPartner(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Partner Name</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdatePartnerName} className="space-y-4 py-4">
            <Label>Partner Name</Label><Input value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} required />
            <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Delete Partner Dialog */}
      <AlertDialog open={!!deletingPartner} onOpenChange={() => setDeletingPartner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the partner "{deletingPartner?.name}" and all their transactions.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeletePartner} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateTransaction} className="space-y-4 py-4">
            <Label>Date</Label><Input type="date" value={editingTransaction?.date || ''} onChange={e => setEditingTransaction({...editingTransaction, date: e.target.value})} required />
            <Label>Details</Label><Input value={editingTransaction?.details || ''} onChange={e => setEditingTransaction({...editingTransaction, details: e.target.value})} required />
            <Label>Amount</Label><Input type="number" value={editingTransaction?.amount || ''} onChange={e => setEditingTransaction({...editingTransaction, amount: e.target.value})} required />
            <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Delete Transaction Dialog */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this transaction.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTransaction} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PartnerProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { partnerProducts } = useInventory();

  const product = partnerProducts?.find((p) => p.id === params.id);

  if (!product) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <p className="text-muted-foreground mb-6">The product you are looking for does not exist or has been removed.</p>
        <Button onClick={() => router.push("/partners")}><ArrowLeft className="mr-2 h-4 w-4" />Back to Partner Imports</Button>
      </div>
    );
  }

  const formatNum = (num, digits = 2) => Number(num || 0).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <PageHeader title={product.productName} description={`Details for product import on ${new Date(product.createdAt || product.date).toLocaleDateString()}`} actions={<Button onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Import Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="font-semibold text-muted-foreground">Supplier</div><div>{product.supplierName}</div>
            <div className="font-semibold text-muted-foreground">Date</div><div>{new Date(product.date).toLocaleDateString()}</div>
            <div className="font-semibold text-muted-foreground">Quantity</div><div>{formatNum(product.quantityMeter)} meters / {formatNum(product.quantityYard)} yards</div>
            <div className="font-semibold text-muted-foreground">Price per Meter</div><div>${formatNum(product.priceDollar)}</div>
            <div className="font-semibold text-muted-foreground">Dollar Rate</div><div>৳{formatNum(product.dollarRate)}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader><CardTitle className="text-primary">Landed Cost</CardTitle><CardDescription>Final cost per yard in Taka.</CardDescription></CardHeader>
          <CardContent className="text-center"><p className="text-4xl font-bold text-primary">৳{formatNum(product.pricePerYard)}</p><p className="text-sm text-muted-foreground">per yard</p></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Cost Breakdown</CardTitle><CardDescription>Detailed breakdown of all costs involved.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center border-b pb-2"><span className="text-muted-foreground">Total Price (USD)</span><span className="font-semibold">${formatNum(product.totalPriceDollar)}</span></div>
          <div className="flex justify-between items-center border-b pb-2"><span className="text-muted-foreground">Total Price (Taka)</span><span className="font-semibold">৳{formatNum(product.totalPriceTaka)}</span></div>
          <div className="flex justify-between items-center border-b pb-2"><span className="text-muted-foreground">Premium (Taka)</span><span className="font-semibold">৳{formatNum(product.premiumTaka)}</span></div>
          <div className="flex justify-between items-center border-b pb-2"><span className="text-muted-foreground">Other Costs (Taka)</span><span className="font-semibold">৳{formatNum(product.otherCostTaka)}</span></div>
          <div className="flex justify-between items-center pt-2 font-bold text-lg"><span>Total Landed Cost (Taka)</span><span>৳{formatNum(product.totalCostTaka)}</span></div>
        </CardContent>
      </Card>
      <hr />
      <PartnerAccounts product={product} />
    </div>
  );
}
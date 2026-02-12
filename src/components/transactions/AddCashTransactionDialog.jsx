"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useTransactions } from "@/contexts/transaction-context";
import { CASH_TRANSACTION_CATEGORIES } from "@/lib/constants";

export function AddCashTransactionDialog({ onAddTransaction, children }) {
  const { transactionCategories, addCategory } = useTransactions();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("income");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
    amount: "",
    paymentMode: "cash", // 'cash' or 'bank'
    category: "",
    transferType: "deposit", // 'deposit' (Cash->Bank) or 'withdraw' (Bank->Cash)
  });

  // Merge default and custom categories
  const incomeCategories = [
    ...CASH_TRANSACTION_CATEGORIES.INCOME,
    ...(transactionCategories || []).filter(c => c.type === 'INCOME').map(c => c.name)
  ];
  
  const expenseCategories = [
    ...CASH_TRANSACTION_CATEGORIES.EXPENSE,
    ...(transactionCategories || []).filter(c => c.type === 'EXPENSE').map(c => c.name)
  ];

  // Reset category when switching tabs
  useEffect(() => {
    setFormData(prev => ({ ...prev, category: "", description: "" }));
    setIsCustomCategory(false);
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);

    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    
    if (activeTab !== 'transfer' && !formData.description) {
        alert("Please enter a description.");
        return;
    }

    try {
      const transaction = {
        type: activeTab,
        date: formData.date,
        amount: amount,
        description: formData.description,
        reference: formData.reference,
      };

      if (activeTab === 'transfer') {
        transaction.transferType = formData.transferType;
        if (!transaction.description) {
           transaction.description = formData.transferType === 'deposit' 
             ? 'Bank Deposit (Cash -> Bank)' 
             : 'Bank Withdrawal (Bank -> Cash)';
        }
        transaction.category = "Transfer";
      } else {
        transaction.paymentMode = formData.paymentMode;
        transaction.category = formData.category || (activeTab === 'income' ? 'Other Income' : 'Other Expense');

        // Save custom category if it's new
        if (isCustomCategory && formData.category) {
            const currentCategories = activeTab === 'income' ? incomeCategories : expenseCategories;
            if (!currentCategories.includes(formData.category)) {
                await addCategory({
                    name: formData.category,
                    type: activeTab.toUpperCase()
                });
            }
        }
      }

      await onAddTransaction(transaction);

      // Reset form (keep date)
      setFormData((prev) => ({
        ...prev,
        description: "",
        reference: "",
        amount: "",
        category: "",
      }));
      setIsCustomCategory(false);
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Failed to add transaction. Please try again.");
    }
  };

  const renderCategorySelect = (categories) => (
    <div className="space-y-2">
      <Label htmlFor="category">Category</Label>
      <div className="space-y-2">
        <Select
          value={isCustomCategory ? "custom" : formData.category}
          onValueChange={(value) => {
            if (value === "custom") {
              setIsCustomCategory(true);
              setFormData((prev) => ({ ...prev, category: "" }));
            } else {
              setIsCustomCategory(false);
              setFormData((prev) => ({ ...prev, category: value }));
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
            <div className="border-t my-1" />
            <SelectItem value="custom">Other / Custom</SelectItem>
          </SelectContent>
        </Select>
        
        {isCustomCategory && (
           <Input
            placeholder="Enter custom category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            required
           />
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <FormErrorBoundary>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
               <Label htmlFor="date">Date</Label>
               <Input
                 id="date"
                 type="date"
                 value={formData.date}
                 onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                 required
               />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expense">Expense</TabsTrigger>
                <TabsTrigger value="transfer">Transfer</TabsTrigger>
              </TabsList>
              
              <div className="mt-4 space-y-4">
                 {/* Common Amount Field */}
                 <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                 </div>

                 {activeTab === 'transfer' ? (
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <Label>Transfer Type</Label>
                          <RadioGroup 
                             value={formData.transferType} 
                             onValueChange={(val) => setFormData(prev => ({ ...prev, transferType: val }))}
                             className="flex gap-4"
                          >
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="deposit" id="deposit" />
                                <Label htmlFor="deposit">Deposit (Cash to Bank)</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="withdraw" id="withdraw" />
                                <Label htmlFor="withdraw">Withdraw (Bank to Cash)</Label>
                             </div>
                          </RadioGroup>
                       </div>
                    </div>
                 ) : (
                    <>
                       <div className="space-y-2">
                          <Label>Payment Mode</Label>
                          <RadioGroup 
                             value={formData.paymentMode} 
                             onValueChange={(val) => setFormData(prev => ({ ...prev, paymentMode: val }))}
                             className="flex gap-4"
                          >
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="cash" id="cash" />
                                <Label htmlFor="cash">Cash</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="bank" id="bank" />
                                <Label htmlFor="bank">Bank</Label>
                             </div>
                          </RadioGroup>
                       </div>
                       
                       {renderCategorySelect(activeTab === 'income' ? incomeCategories : expenseCategories)}
                    </>
                 )}

                 <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={activeTab === 'transfer' ? "Optional description" : "Transaction description"}
                      required={activeTab !== 'transfer'}
                    />
                 </div>
                 
                 <div className="space-y-2">
                    <Label htmlFor="reference">Reference (Optional)</Label>
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                      placeholder="Check no, Receipt no, etc."
                    />
                 </div>
              </div>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Transaction</Button>
            </div>
          </form>
        </FormErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}

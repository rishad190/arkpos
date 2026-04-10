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
import { useCustomers } from "@/contexts/customer-context";
import { useLoans } from "@/contexts/loan-context";
import { useProducts } from "@/contexts/product-context";
import { CASH_TRANSACTION_CATEGORIES } from "@/lib/constants";
import { numberToWords } from "@/lib/utils";
import { TrashIcon } from "lucide-react";

export function AddCashTransactionDialog({ onAddTransaction, children }) {
  const { transactionCategories, addCategory, deleteCategory, addTransaction } = useTransactions();
  const { customers } = useCustomers();
  const { loans, addLoanTransaction } = useLoans();
  const { products, addProductTransaction } = useProducts();
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
    customerId: "none", // For customer payment
    loanId: "none",
    loanAction: "PRINCIPAL",
    productId: "none",
    productAction: "PRODUCT_COST",
    productPartnerName: "",
    productSoldQuantity: "",
    productSoldColor: "",
    productSoldToCustomer: "",
    transferType: "deposit", // 'deposit' (Cash->Bank) or 'withdraw' (Bank->Cash)
  });

  // Extract custom category objects for current tab to allow deletion
  const customIncomeCategories = (transactionCategories || []).filter(c => c.type === 'INCOME' && c.name !== 'Customer Payment');
  const customExpenseCategories = (transactionCategories || []).filter(c => c.type === 'EXPENSE');

  // Merge default and custom categories names
  const incomeCategoryNames = [
    ...CASH_TRANSACTION_CATEGORIES.INCOME,
    "Customer Payment",
    ...customIncomeCategories.map(c => c.name)
  ];
  const uniqueIncomeCategories = [...new Set(incomeCategoryNames)];
  
  const expenseCategoryNames = [
    ...CASH_TRANSACTION_CATEGORIES.EXPENSE,
    ...customExpenseCategories.map(c => c.name)
  ];
  const uniqueExpenseCategories = [...new Set(expenseCategoryNames)];

  // Reset category when switching tabs
  useEffect(() => {
    setFormData(prev => ({ ...prev, category: "", description: "", customerId: "none", productPartnerName: "" }));
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
      const isCustomerPayment = activeTab === 'income' && formData.category === 'Customer Payment';
      const isLoanTransaction = formData.category === 'Loan Activity';
      const isProductTransaction = formData.category === 'Product Activity';
      
      if (isCustomerPayment && (!formData.customerId || formData.customerId === "none")) {
        alert("Please select a customer for the payment.");
        return;
      }

      if (isLoanTransaction && (!formData.loanId || formData.loanId === "none")) {
        alert("Please select a loan account.");
        return;
      }

      if (isProductTransaction && (!formData.productId || formData.productId === "none")) {
        alert("Please select a product.");
        return;
      }

      if (isCustomerPayment) {
        // Handle Customer Payment specific routing
        // This goes through the main transaction service to update customer balances
        const customer = customers.find(c => c.id === formData.customerId);
        
        const transaction = {
          customerId: formData.customerId,
          date: formData.date,
          memoNumber: formData.reference || `PAY-${Date.now()}`,
          total: 0, // It's a payment, so no new charge
          deposit: amount,
          type: "payment",
          cashbookType: "income",
          paymentMode: formData.paymentMode,
          description: formData.description || `Payment from ${customer?.name || 'Customer'}`,
        };
        
        await addTransaction(transaction); // From useTransactions context
      } else if (isLoanTransaction) {
        // Handle Loan Activity routing
        const loan = loans.find(l => l.id === formData.loanId);
        let loanAmount = amount;
        
        if (formData.loanAction === 'PRINCIPAL') {
            if (loan.type === 'GIVEN') {
                // Given loan: Expense(giving money) = positive addition, Income(receiving money) = negative addition (repayment)
                loanAmount = activeTab === 'income' ? -amount : amount;
            } else {
                // Taken loan: Income(receiving money) = positive addition, Expense(giving money) = negative addition (repayment)
                loanAmount = activeTab === 'income' ? amount : -amount;
            }
        } else {
            // Profit is always recorded as a positive absolute value being tracked
            loanAmount = Math.abs(amount);
        }

        // 1. Add to Loan Ledger
        if (addLoanTransaction) {
           await addLoanTransaction(formData.loanId, {
               type: formData.loanAction,
               amount: loanAmount,
               date: formData.date,
               note: formData.description
           });
        }

        // 2. Standard Cashbook routing
        const transaction = {
          type: activeTab,
          date: formData.date,
          amount: amount,
          description: formData.description || `Loan Activity - ${loan.name}`,
          reference: formData.reference,
          category: formData.category,
          paymentMode: formData.paymentMode,
          loanId: formData.loanId,
        };
        await onAddTransaction(transaction);
      } else if (isProductTransaction) {
        // Handle Product Activity routing
        const product = products.find(p => p.id === formData.productId);

        if (addProductTransaction) {
           await addProductTransaction(formData.productId, {
               type: formData.productAction,
               amount: amount,
               date: formData.date,
               partnerName: formData.productPartnerName,
               note: formData.description,
               ...(formData.productAction === 'PRODUCT_SALE' && {
                  soldQuantity: formData.productSoldQuantity || "",
                  soldColor: formData.productSoldColor || "",
                  soldToCustomer: formData.productSoldToCustomer || ""
               })
           });
        }

        // Connect PRODUCT_SALE to specific Customer's ledger if provided
        if (formData.productAction === 'PRODUCT_SALE' && formData.productSoldToCustomer) {
            const matchedCustomer = customers?.find(c => c.name?.trim().toLowerCase() === formData.productSoldToCustomer?.trim().toLowerCase());
            if (matchedCustomer && addTransaction) {
                const customerLedgerTx = {
                    customerId: matchedCustomer.id,
                    date: formData.date,
                    memoNumber: formData.reference || `PSALE-${Date.now()}`,
                    total: amount,       // Goods sold value
                    deposit: amount,     // Cash received right now (since it's a cashbook entry)
                    due: 0,
                    type: "sale",
                    details: formData.description || `Cash Product Sale: ${product?.name}`,
                };
                await addTransaction(customerLedgerTx);
            }
        }

        let generatedDesc = `Product Activity: ${product?.name}`;
        if (formData.productAction === 'PRODUCT_SALE') {
            generatedDesc = `Product Sale: ${product?.name}`;
            const extraTags = [];
            if (formData.productSoldToCustomer) extraTags.push(`To: ${formData.productSoldToCustomer}`);
            if (formData.productSoldQuantity) extraTags.push(`Qty: ${formData.productSoldQuantity}`);
            
            if (extraTags.length > 0) {
                generatedDesc += ` (${extraTags.join(', ')})`;
            }
        } else if (formData.productAction === 'PARTNER_INVESTMENT' || formData.productAction === 'PARTNER_PAYOUT') {
            generatedDesc = `Product ${formData.productAction === 'PARTNER_PAYOUT' ? 'Payout' : 'Investment'}: ${product?.name} (${formData.productPartnerName})`;
        }

        const transaction = {
          type: activeTab,
          date: formData.date,
          amount: amount,
          description: formData.description || generatedDesc,
          reference: formData.reference,
          category: formData.category,
          paymentMode: formData.paymentMode,
          productId: formData.productId,
          productName: product?.name,
          productAction: formData.productAction,
          productSoldQuantity: formData.productSoldQuantity || "",
          productSoldColor: formData.productSoldColor || "",
          productSoldToCustomer: formData.productSoldToCustomer || "",
        };
        await onAddTransaction(transaction);
      } else {
        // Standard Cashbook routing
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
              const currentCategories = activeTab === 'income' ? uniqueIncomeCategories : uniqueExpenseCategories;
              if (!currentCategories.includes(formData.category)) {
                  await addCategory({
                      name: formData.category,
                      type: activeTab.toUpperCase()
                  });
              }
          }
        }

        await onAddTransaction(transaction); // Uses AddAccountTransaction
      }

      // Reset form (keep date)
      setFormData((prev) => ({
        ...prev,
        description: "",
        reference: "",
        amount: "",
        customerId: "none",
        productSoldQuantity: "",
        productSoldColor: "",
        productSoldToCustomer: "",
      }));
      // Keep category and isCustomCategory state for faster entry unless it was a customer payment
      if (isCustomerPayment) {
          setFormData(prev => ({ ...prev, category: "" }));
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Failed to add transaction. Please try again.");
    }
  };

  const renderCategorySelect = () => {
    const isIncome = activeTab === 'income';
    const defaultCategoriesRaw = isIncome ? [...CASH_TRANSACTION_CATEGORIES.INCOME, "Customer Payment"] : CASH_TRANSACTION_CATEGORIES.EXPENSE;
    const defaultCategories = [...new Set(defaultCategoriesRaw)];
    const customCategories = isIncome ? customIncomeCategories : customExpenseCategories;

    const handleDeleteCategory = async (e, categoryId) => {
      e.stopPropagation();
      e.preventDefault();
      if (confirm("Are you sure you want to delete this custom category?")) {
        try {
          await deleteCategory(categoryId);
          if (formData.category === customCategories.find(c => c.id === categoryId)?.name) {
             setFormData(prev => ({ ...prev, category: "" }));
          }
        } catch (error) {
           console.error("Failed to delete category", error);
        }
      }
    };

    return (
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <div className="space-y-2">
          <Select
            value={isCustomCategory ? "custom" : formData.category}
            onValueChange={(value) => {
              if (value === "custom") {
                setIsCustomCategory(true);
                setFormData((prev) => ({ ...prev, category: "", customerId: "none" }));
              } else {
                setIsCustomCategory(false);
                setFormData((prev) => ({ ...prev, category: value, customerId: "none" }));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {/* Default Categories */}
              {defaultCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
              
              {/* Custom Categories with Delete Button */}
              {customCategories.length > 0 && (
                <>
                  <div className="border-t my-1" />
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Custom</div>
                  {customCategories.map((cat) => (
                    <div key={cat.id} className="flex flex-row items-center justify-between w-full pr-2">
                       <SelectItem value={cat.name} className="flex-1 pr-6">
                         {cat.name}
                       </SelectItem>
                       <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive shrink-0 -ml-10 z-10 hover:bg-destructive/10 cursor-pointer"
                          onClick={(e) => handleDeleteCategory(e, cat.id)}
                       >
                         <TrashIcon className="h-3 w-3" />
                       </Button>
                    </div>
                  ))}
                </>
              )}
              
              <div className="border-t my-1" />
              <SelectItem value="custom">Other / Custom Type...</SelectItem>
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

          {/* Customer Selection for Customer Payment */}
          {formData.category === 'Customer Payment' && (
             <div className="pt-2">
               <Label htmlFor="customer">Select Customer</Label>
               <Select
                 value={formData.customerId}
                 onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}
               >
                 <SelectTrigger className="mt-2">
                   <SelectValue placeholder="Choose a customer" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="none" disabled>Select Customer</SelectItem>
                   {customers.map((c) => (
                     <SelectItem key={c.id} value={c.id}>
                       {c.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
          )}

          {/* Loan Selection for Loan Activity */}
          {formData.category === 'Loan Activity' && (
             <div className="pt-2 space-y-4">
               <div>
                  <Label htmlFor="loan">Select Loan Account</Label>
                  <Select
                    value={formData.loanId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, loanId: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose a loan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>Select Loan</SelectItem>
                      {loans.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name} ({l.type === 'GIVEN' ? 'Asset' : 'Liability'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
               
               <div>
                   <Label>Nature of Payment</Label>
                   <Select
                     value={formData.loanAction}
                     onValueChange={(value) => setFormData(prev => ({ ...prev, loanAction: value }))}
                   >
                       <SelectTrigger className="mt-2">
                           <SelectValue placeholder="Select type" />
                       </SelectTrigger>
                       <SelectContent>
                           <SelectItem value="PRINCIPAL">Principal Amount</SelectItem>
                           <SelectItem value="PROFIT">Profit Amount</SelectItem>
                       </SelectContent>
                   </Select>
               </div>
             </div>
          )}

          {/* Product Selection for Product Activity */}
          {formData.category === 'Product Activity' && (
             <div className="pt-2 space-y-4">
               <div>
                  <Label htmlFor="product">Select Product / Project</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, productId: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>Select Product</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
               
               <div>
                   <Label>Nature of Cashflow</Label>
                   <Select
                     value={formData.productAction}
                     onValueChange={(value) => setFormData(prev => ({ ...prev, productAction: value, productPartnerName: "" }))}
                   >
                       <SelectTrigger className="mt-2">
                           <SelectValue placeholder="Select type" />
                       </SelectTrigger>
                       <SelectContent>
                           {activeTab === 'expense' ? (
                             <>
                               <SelectItem value="PRODUCT_COST">Product Cost</SelectItem>
                               <SelectItem value="OTHER_EXPENSE">Other Expense</SelectItem>
                               <SelectItem value="PARTNER_PAYOUT">Partner Payout</SelectItem>
                             </>
                           ) : (
                             <>
                               <SelectItem value="PARTNER_INVESTMENT">Partner Investment</SelectItem>
                               <SelectItem value="PRODUCT_SALE">Product Sale</SelectItem>
                             </>
                           )}
                       </SelectContent>
                   </Select>
               </div>
               
               {formData.productAction === 'PARTNER_INVESTMENT' && (
                 <div>
                   <Label>Partner Name</Label>
                   <Input 
                     className="mt-2"
                     list="global-partner-names-list"
                     placeholder="Name of Partner..."
                     value={formData.productPartnerName || ''}
                     onChange={(e) => setFormData(prev => ({ ...prev, productPartnerName: e.target.value }))}
                     required
                   />
                   <datalist id="global-partner-names-list">
                     {Object.keys(products.find(p => p.id === formData.productId)?.partners || {}).map(name => (
                         <option key={name} value={name} />
                     ))}
                   </datalist>
                 </div>
               )}

               {formData.productAction === 'PARTNER_PAYOUT' && (
                 <div>
                   <Label>Select Partner</Label>
                   <Select 
                     value={formData.productPartnerName || ''}
                     onValueChange={(v) => setFormData(prev => ({ ...prev, productPartnerName: v }))}
                     required
                   >
                     <SelectTrigger className="mt-2"><SelectValue placeholder="Choose partner..." /></SelectTrigger>
                     <SelectContent>
                         {Object.keys(products.find(p => p.id === formData.productId)?.partners || {}).length === 0 && (
                            <SelectItem value="none" disabled>No active partners</SelectItem>
                         )}
                         {Object.keys(products.find(p => p.id === formData.productId)?.partners || {}).map(name => (
                             <SelectItem key={name} value={name}>{name}</SelectItem>
                         ))}
                     </SelectContent>
                   </Select>
                 </div>
               )}

               {formData.productAction === 'PRODUCT_SALE' && (
                 <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <Label>Sold Qty (Opt)</Label>
                         <Input 
                           className="mt-2"
                           placeholder="e.g. 50"
                           value={formData.productSoldQuantity || ''}
                           onChange={(e) => setFormData(prev => ({ ...prev, productSoldQuantity: e.target.value }))}
                         />
                       </div>
                       <div>
                         <Label>Color (Opt)</Label>
                         <Input 
                           className="mt-2"
                           placeholder="e.g. Red"
                           value={formData.productSoldColor || ''}
                           onChange={(e) => setFormData(prev => ({ ...prev, productSoldColor: e.target.value }))}
                         />
                       </div>
                     </div>
                     <div>
                       <Label>Sold To (Customer Name)</Label>
                       <Select 
                         value={formData.productSoldToCustomer || "none"} 
                         onValueChange={(v) => setFormData(prev => ({ ...prev, productSoldToCustomer: v === "none" ? "" : v }))}
                       >
                         <SelectTrigger className="mt-2">
                             <SelectValue placeholder="Select an existing customer..." />
                         </SelectTrigger>
                         <SelectContent>
                             <SelectItem value="none">No Customer (General Sale)</SelectItem>
                             {customers?.map(c => (
                                 <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                             ))}
                         </SelectContent>
                       </Select>
                     </div>
                 </div>
               )}
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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
                    {formData.amount && Number(formData.amount) > 0 && (
                      <p className="text-sm text-muted-foreground capitalize">
                        {numberToWords(Number(formData.amount))} Taka Only
                      </p>
                    )}
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
                       
                       {renderCategorySelect()}
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

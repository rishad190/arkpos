"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useInventory } from "@/contexts/inventory-context";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { 
  Camera, 
  Upload, 
  Loader2, 
  Check, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  X, 
  Search,
  CheckSquare,
  Square,
  HelpCircle,
  Eye,
  EyeOff
} from "lucide-react";

export function LedgerExtractorDialog({ children, selectedDate }) {
  const targetDate = selectedDate || new Date().toISOString().split("T")[0];
  const { addAccountTransaction, addTransaction, addCategory, transactionCategories } = useTransactions();
  const { customers } = useCustomers();
  const { loans, addLoanTransaction } = useLoans();
  const { products, addProductTransaction } = useProducts();
  const { suppliers, addSupplierTransaction } = useInventory();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Scanning, 3: Review, 4: Importing
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  // Mobile responsive active review tab state
  const [activeReviewTab, setActiveReviewTab] = useState("income");
  
  // OCR Results State
  const [extractedItems, setExtractedItems] = useState([]); // Array of parsed transactions
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: "" });
  
  // Search states for dropdowns
  const [customerSearches, setCustomerSearches] = useState({});
  const [productSearches, setProductSearches] = useState({});
  const [supplierSearches, setSupplierSearches] = useState({});
  const [productCustomerSearches, setProductCustomerSearches] = useState({});

  // Load API key from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("arkpos_gemini_api_key") || "";
      setApiKey(savedKey);
    }
  }, []);

  const saveApiKey = (key) => {
    setApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("arkpos_gemini_api_key", key);
    }
  };

  const handleFileChange = (file) => {
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setStep(1);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select an image file (PNG, JPG, WEBP).",
        variant: "destructive",
      });
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Data = reader.result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const runOCR = async () => {
    const finalApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || apiKey;
    if (!finalApiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your Gemini API Key first.",
        variant: "destructive",
      });
      return;
    }

    if (!imageFile) {
      toast({
        title: "No Image Selected",
        description: "Please upload or capture a ledger image.",
        variant: "destructive",
      });
      return;
    }

    setStep(2); // Scanning step

    try {
      const base64Image = await fileToBase64(imageFile);
      
      const prompt = `
Extract transactions from this handwritten daily cash book ledger image. 
The ledger layout is split vertically: Left column contains Inflow/Income (জমা / ইনকাম) and Right column contains Outflow/Expense (খরচ / পেমেন্ট).

Identify all transaction entries.
Recognize Bengali handwriting (including cursive), Bengali numbers (১, ২, ৩...), English words, and mixed text.
Strictly convert all Bengali digits/numerals to standard English decimal numbers (e.g. ১৫০০ -> 1500, ৩০০০ -> 3000, ১,০৫,০০০ -> 105000).

For each identified transaction, populate:
1. "description": transaction detail/description. If the description is written in Bengali, translate it to English (e.g., "সুতা কেনা" -> "Yarn purchase", "গাড়ি ভাড়া" -> "Car rent", "নাস্তা" -> "Snacks/Breakfast"). Transliterate names to English (e.g., "আলমগীর" -> "Alamgir"). The final output value must be fully in English.
2. "amount": parsed numeric amount.
3. "paymentMode": "bank" if description contains bank-related terms (e.g. CC 98, সিসি, bank, bkash, nagad, check, cards, ব্যাংক, বিকাশ, নগদ, চেক) else "cash".
4. "suggestedCategory": based on context, choose one of these string values:
   - For Income: "Customer Payment" (if customer payment/due collection/ledger payment), "Partner Payment" (if partner deposit/equity), "Loan Activity" (if loan received), "Other Income" (general).
   - For Expense: "Supplier Payment" (vendor payment), "Product Activity" (buying fabrics/materials), "Loan Activity" (loan repayment/giving), "Own Expense", "Shop Expense", "Other Expense".

Return the response as a strict JSON object structure:
{
  "income": [
    {
      "description": string,
      "amount": number,
      "paymentMode": "cash" | "bank",
      "suggestedCategory": string
    }
  ],
  "expense": [
    {
      "description": string,
      "amount": number,
      "paymentMode": "cash" | "bank",
      "suggestedCategory": string
    }
  ]
}

Ensure the output is valid JSON. Do not include markdown codeblocks (like \`\`\`json) in the response.
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${finalApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: imageFile.type,
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API returned error status: ${response.status}`);
      }

      const resData = await response.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) {
        throw new Error("Empty response received from Gemini API.");
      }

      // Parse the JSON response
      const parsed = JSON.parse(rawText.trim());
      
      // Normalize and add client-side unique IDs and default transaction routing states
      const normalizedIncome = (parsed.income || []).map((item, idx) => ({
        ...item,
        id: `inc-${idx}-${Date.now()}`,
        type: "income",
        approved: true,
        customerId: "none",
        loanId: "none",
        loanAction: "PRINCIPAL",
        productId: "none",
        productAction: item.suggestedCategory === "Partner Payment" ? "PARTNER_INVESTMENT" : "PRODUCT_COST",
        supplierId: "none",
        selectedProducts: [],
        productSoldQuantity: "",
        productSoldColor: "",
        productSoldToCustomer: "none",
        category: item.suggestedCategory || "Other Income",
        bankFlow: "standard_bank"
      }));

      const normalizedExpense = (parsed.expense || []).map((item, idx) => ({
        ...item,
        id: `exp-${idx}-${Date.now()}`,
        type: "expense",
        approved: true,
        customerId: "none",
        loanId: "none",
        loanAction: "PRINCIPAL",
        productId: "none",
        productAction: "PRODUCT_COST",
        supplierId: "none",
        selectedProducts: [],
        productSoldQuantity: "",
        productSoldColor: "",
        productSoldToCustomer: "none",
        category: item.suggestedCategory || "Other Expense",
        bankFlow: "standard_bank"
      }));

      setExtractedItems([...normalizedIncome, ...normalizedExpense]);
      setStep(3); // Review step
      
      toast({
        title: "Analysis Complete",
        description: `Extracted ${normalizedIncome.length} Incomes and ${normalizedExpense.length} Expenses from ledger.`,
      });
    } catch (error) {
      console.error("Gemini OCR error:", error);
      setStep(1);
      toast({
        title: "Scanning Failed",
        description: error.message || "Failed to process image. Please check API Key and try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateItem = (id, fields) => {
    setExtractedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...fields } : item))
    );
  };

  const handleDeleteItem = (id) => {
    setExtractedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSelectAll = (type, val) => {
    setExtractedItems(prev =>
      prev.map(item => (item.type === type ? { ...item, approved: val } : item))
    );
  };

  // Calculations for summary card
  const stats = useMemo(() => {
    let incomeTotal = 0;
    let expenseTotal = 0;
    let approvedIncomeCount = 0;
    let approvedExpenseCount = 0;

    extractedItems.forEach(item => {
      if (item.approved) {
        if (item.type === "income") {
          incomeTotal += item.amount || 0;
          approvedIncomeCount++;
        } else {
          expenseTotal += item.amount || 0;
          approvedExpenseCount++;
        }
      }
    });

    return {
      incomeTotal,
      expenseTotal,
      balance: incomeTotal - expenseTotal,
      approvedIncomeCount,
      approvedExpenseCount
    };
  }, [extractedItems]);

  const handleBatchImport = async () => {
    const toImport = extractedItems.filter(item => item.approved);
    if (toImport.length === 0) {
      toast({
        title: "No Transactions Selected",
        description: "Please check at least one transaction to import.",
        variant: "warning",
      });
      return;
    }

    setStep(4); // Importing progress step
    setImportProgress({ current: 0, total: toImport.length, status: "Starting batch import..." });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toImport.length; i++) {
      const item = toImport[i];
      setImportProgress({
        current: i + 1,
        total: toImport.length,
        status: `Processing (${i + 1}/${toImport.length}): ${item.description}`,
      });

      try {
        const amount = Number(item.amount);
        const isCustomerPayment = item.type === "income" && item.category === "Customer Payment";
        const isLoanTransaction = item.category === "Loan Activity";
        const isProductTransaction = item.category === "Product Activity";
        const isTransfer = item.category === "Transfer" || item.bankFlow === "transfer_withdraw" || item.bankFlow === "transfer_deposit";

        // 1. Customer Payment
        if (isCustomerPayment) {
          if (!item.customerId || item.customerId === "none") {
            throw new Error("No customer selected for Customer Payment.");
          }
          const customer = customers.find(c => c.id === item.customerId);
          const transaction = {
            customerId: item.customerId,
            date: targetDate,
            memoNumber: `PAY-OCR-${Date.now()}-${i}`,
            total: 0,
            deposit: amount,
            type: "payment",
            cashbookType: "income",
            paymentMode: item.paymentMode,
            description: item.description || `Payment from ${customer?.name || "Customer"}`,
          };
          await addTransaction(transaction);
        }
        // 2. Loan Activity
        else if (isLoanTransaction) {
          if (!item.loanId || item.loanId === "none") {
            throw new Error("No loan account selected.");
          }
          const loan = loans.find(l => l.id === item.loanId);
          let loanAmount = amount;
          
          if (item.loanAction === "PRINCIPAL") {
            if (loan.type === "GIVEN") {
              loanAmount = item.type === "income" ? -amount : amount;
            } else {
              loanAmount = item.type === "income" ? amount : -amount;
            }
          } else {
            loanAmount = Math.abs(amount);
          }

          if (addLoanTransaction) {
            await addLoanTransaction(item.loanId, {
              type: item.loanAction,
              amount: loanAmount,
              date: targetDate,
              note: item.description,
            });
          }

          const transaction = {
            type: item.type,
            date: targetDate,
            amount: amount,
            description: item.description || `Loan Activity - ${loan.name}`,
            reference: "OCR Import",
            category: item.category,
            paymentMode: item.paymentMode,
            loanId: item.loanId,
          };
          await addAccountTransaction(transaction);
        }
        // 3. Product Activity
        else if (isProductTransaction) {
          if (item.productAction !== "PARTNER_PAYOUT" && (!item.productId || item.productId === "none")) {
            throw new Error("No product selected for Product Activity.");
          }
          if (item.productAction === "PARTNER_PAYOUT" && (!item.selectedProducts || item.selectedProducts.length === 0)) {
            throw new Error("At least one product must be selected for partner payout.");
          }
          if ((item.productAction === "PARTNER_INVESTMENT" || item.productAction === "PARTNER_PAYOUT") && (!item.supplierId || item.supplierId === "none")) {
            throw new Error("Partner/Supplier is required.");
          }

          const product = item.productAction !== "PARTNER_PAYOUT" ? products.find(p => p.id === item.productId) : null;
          const supplier = (item.productAction === "PARTNER_INVESTMENT" || item.productAction === "PARTNER_PAYOUT") ? suppliers.find(s => s.id === item.supplierId) : null;

          if (item.productAction === "PARTNER_PAYOUT") {
            const productNames = item.selectedProducts.map(pid => products.find(p => p.id === pid)?.name).filter(Boolean);
            const detailsDesc = item.description || `Payout for products: ${productNames.join(", ")}`;
            
            if (addSupplierTransaction && supplier) {
              await addSupplierTransaction({
                supplierId: supplier.id,
                date: targetDate,
                totalAmount: 0,
                paidAmount: amount,
                details: detailsDesc,
                invoiceNumber: `PAYOUT-OCR-${Date.now()}-${i}`,
              });
            }

            const transaction = {
              type: item.type,
              date: targetDate,
              amount: amount,
              description: detailsDesc,
              reference: "OCR Import",
              category: item.category,
              paymentMode: item.paymentMode,
              productAction: item.productAction,
              supplierId: item.supplierId,
            };
            await addAccountTransaction(transaction);
          } else {
            if (addProductTransaction) {
              await addProductTransaction(item.productId, {
                type: item.productAction,
                amount: amount,
                date: targetDate,
                partnerName: supplier?.name || "",
                note: item.description,
                ...(item.productAction === "PRODUCT_SALE" && {
                  soldQuantity: item.productSoldQuantity || "",
                  soldColor: item.productSoldColor || "",
                  soldToCustomer: item.productSoldToCustomer || "",
                }),
              });
            }

            if (item.productAction === "PARTNER_INVESTMENT" && addSupplierTransaction && supplier) {
              await addSupplierTransaction({
                supplierId: supplier.id,
                date: targetDate,
                totalAmount: amount,
                paidAmount: 0,
                details: item.description || `Product invest cost for ${product?.name}`,
                invoiceNumber: `INV-OCR-${Date.now()}-${i}`,
              });
            }

            if (item.productAction === "PRODUCT_SALE" && item.productSoldToCustomer && item.productSoldToCustomer !== "none") {
              const matchedCustomer = customers?.find(c => c.name?.trim().toLowerCase() === item.productSoldToCustomer?.trim().toLowerCase());
              if (matchedCustomer && addTransaction) {
                const customerLedgerTx = {
                  customerId: matchedCustomer.id,
                  date: targetDate,
                  memoNumber: `PSALE-OCR-${Date.now()}-${i}`,
                  total: amount,
                  deposit: amount,
                  due: 0,
                  type: "sale",
                  details: item.description || `Cash Product Sale: ${product?.name}`,
                };
                await addTransaction(customerLedgerTx);
              }
            }

            let generatedDesc = `Product Activity: ${product?.name}`;
            if (item.productAction === "PRODUCT_SALE") {
              generatedDesc = `Product Sale: ${product?.name}`;
              const extraTags = [];
              if (item.productSoldToCustomer && item.productSoldToCustomer !== "none") extraTags.push(`To: ${item.productSoldToCustomer}`);
              if (item.productSoldQuantity) extraTags.push(`Qty: ${item.productSoldQuantity}`);
              if (extraTags.length > 0) generatedDesc += ` (${extraTags.join(", ")})`;
            } else if (item.productAction === "PARTNER_INVESTMENT") {
              generatedDesc = `Product Investment: ${product?.name} (${supplier?.name})`;
            }

            const transaction = {
              type: item.type,
              date: targetDate,
              amount: amount,
              description: item.description || generatedDesc,
              reference: "OCR Import",
              category: item.category,
              paymentMode: item.paymentMode,
              productId: item.productId,
              productName: product?.name,
              productAction: item.productAction,
              supplierId: item.supplierId,
              productSoldQuantity: item.productSoldQuantity || "",
              productSoldColor: item.productSoldColor || "",
              productSoldToCustomer: item.productSoldToCustomer === "none" ? "" : item.productSoldToCustomer,
            };
            await addAccountTransaction(transaction);
          }
        }
        // 3.5. Transfer Activity
        else if (isTransfer) {
          const transferType = item.type === "income" ? "withdraw" : "deposit";
          const transaction = {
            type: "transfer",
            date: targetDate,
            amount: amount,
            description: item.description || (transferType === 'deposit' 
              ? 'Bank Deposit (Cash -> Bank)' 
              : 'Bank Withdrawal (Bank -> Cash)'),
            reference: "OCR Import",
            transferType: transferType,
            category: "Transfer",
          };
          await addAccountTransaction(transaction);
        }
        // 4. Standard transactions
        else {
          // If custom category is entered, create it if it doesn't exist
          const isIncome = item.type === "income";
          const defaultCategoriesRaw = isIncome ? ["Sales", "Customer Payment", "Loan Activity", "Product Activity", "Other Income", "Income from Rent", "Partner Payment"] : ["Supplier Payment", "Loan Activity", "Product Activity", "Own Expense", "Partner Payment", "Shop Expense", "Product Expense", "Short Taka", "Other Expense"];
          
          if (item.category && !defaultCategoriesRaw.includes(item.category)) {
            const alreadyExists = (transactionCategories || []).some(
              c => c.name?.toLowerCase() === item.category.toLowerCase() && c.type === item.type.toUpperCase()
            );
            if (!alreadyExists) {
              await addCategory({
                name: item.category,
                type: item.type.toUpperCase(),
              });
            }
          }

          const transaction = {
            type: item.type,
            date: targetDate,
            amount: amount,
            description: item.description,
            reference: "OCR Import",
            paymentMode: item.paymentMode,
            category: item.category || (isIncome ? "Other Income" : "Other Expense"),
          };
          await addAccountTransaction(transaction);
        }

        successCount++;
      } catch (err) {
        console.error("Failed to import entry:", item, err);
        failCount++;
      }
    }

    setStep(1);
    setOpen(false);
    setImageFile(null);
    setImagePreview("");
    setExtractedItems([]);

    toast({
      title: "Import Finished",
      description: `Successfully added ${successCount} transactions.${failCount > 0 ? ` Failed to add ${failCount} items.` : ""}`,
      variant: failCount > 0 ? "destructive" : "default",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && step === 4) return; // Prevent close during import
      setOpen(val);
      if (!val) {
        setStep(1);
        setImageFile(null);
        setImagePreview("");
        setExtractedItems([]);
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      
      <DialogContent className="max-w-5xl w-[98vw] md:w-[95vw] max-h-[95vh] md:max-h-[90vh] flex flex-col p-3 md:p-6 overflow-hidden bg-card/95 backdrop-blur-lg border border-border/40 rounded-2xl shadow-xl">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Bengali Ledger Scanner (ছবি থেকে হিসাব যোগ করুন)
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1: UPLOAD AND API CONFIGURATION */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* Gemini API Key Block */}
            {!process.env.NEXT_PUBLIC_GEMINI_API_KEY && (
              <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium text-amber-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Gemini API Key Required
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    To perform offline handwriting recognition, this tool runs Gemini 2.5 Flash. Get a free API Key from{" "}
                    <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">
                      Google AI Studio
                    </a>. Key remains in local browser storage.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto min-w-[250px]">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      placeholder="AIzaSy..."
                      value={apiKey}
                      onChange={(e) => saveApiKey(e.target.value)}
                      className="pr-8 h-9 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Drag & Drop File Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.length) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-300 min-h-[300px] cursor-pointer bg-muted/20 ${
                  isDragging ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/60 hover:bg-muted/30"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
                
                <div className="p-4 bg-primary/10 rounded-full mb-4 text-primary">
                  <Upload className="h-8 w-8" />
                </div>
                
                <h3 className="font-semibold text-base mb-1">Select Ledger Image</h3>
                <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                  Drag and drop your image, browse, or click to use device camera.
                </p>
                
                <div className="flex gap-2 mt-6">
                  <Button type="button" variant="outline" size="sm" className="h-9 pointer-events-none">
                    <Camera className="mr-2 h-4 w-4" /> Camera
                  </Button>
                </div>
              </div>

              {/* Image Preview Side */}
              <div className="border border-border/40 rounded-2xl bg-muted/10 p-4 flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
                {imagePreview ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-between gap-4">
                    <div className="relative max-h-[220px] rounded-lg overflow-hidden border">
                      <img src={imagePreview} alt="Ledger Preview" className="object-contain max-h-[220px]" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-600 hover:bg-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageFile(null);
                          setImagePreview("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="w-full text-center">
                      <p className="text-xs font-medium truncate max-w-xs mx-auto">{imageFile?.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{(imageFile?.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2 py-12">
                    <Camera className="h-10 w-10 text-muted-foreground/35 mx-auto" />
                    <p className="text-xs text-muted-foreground">Ledger photo preview will appear here.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Start Button */}
            <div className="flex justify-end pt-4 border-t border-border/40">
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 text-white min-w-[150px]"
                disabled={!imageFile || (!apiKey && !process.env.NEXT_PUBLIC_GEMINI_API_KEY)}
                onClick={runOCR}
              >
                <Sparkles className="mr-2 h-4 w-4 animate-spin-slow" />
                Scan & Extract (ছবি বিশ্লেষণ করুন)
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: SCANNING ANIMATION SCREEN */}
        {step === 2 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-6">
            <div className="relative w-64 h-64 border border-border/50 rounded-xl overflow-hidden shadow-inner flex items-center justify-center bg-background">
              {imagePreview && (
                <img src={imagePreview} alt="Scanning" className="object-contain opacity-65 w-full h-full" />
              )}
              {/* Laser Line Scanner Effect */}
              <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-laser shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            </div>
            
            <div className="text-center space-y-2 max-w-md">
              <div className="flex items-center justify-center gap-2 text-primary font-bold">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Reading Ledger Handwriting...</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Gemini is processing the ledger columns, reading handwritten Bengali text and numbers, and organizing transactions. Please hold on.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: INTERACTIVE REVIEW & VERIFICATION */}
        {step === 3 && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 py-4">
            {/* Summary Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 mb-4 bg-muted/30 border border-border/40 rounded-xl">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Income Checked</p>
                <p className="text-lg font-bold text-green-600">{stats.approvedIncomeCount} items</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Expense Checked</p>
                <p className="text-lg font-bold text-red-600">{stats.approvedExpenseCount} items</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Selected Net Impact</p>
                <p className={`text-lg font-bold ${stats.balance >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                  ৳{stats.balance.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center justify-end">
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="h-8">
                  Back / Re-upload
                </Button>
              </div>
            </div>

            {/* Mobile Tab Selectors */}
            <div className="flex md:hidden gap-2 mb-4">
              <Button 
                type="button"
                variant={activeReviewTab === "income" ? "default" : "outline"} 
                className={`flex-1 text-xs py-2 h-9 font-bold ${activeReviewTab === "income" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                onClick={() => setActiveReviewTab("income")}
              >
                INCOME (৳{stats.incomeTotal.toLocaleString()})
              </Button>
              <Button 
                type="button"
                variant={activeReviewTab === "expense" ? "default" : "outline"} 
                className={`flex-1 text-xs py-2 h-9 font-bold ${activeReviewTab === "expense" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                onClick={() => setActiveReviewTab("expense")}
              >
                EXPENSE (৳{stats.expenseTotal.toLocaleString()})
              </Button>
            </div>

            {/* Side-by-side Review Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-hidden">
              
              {/* INCOME COLUMN */}
              <div className={`flex-col border border-border/40 rounded-xl overflow-hidden min-h-0 bg-background/40 md:flex ${activeReviewTab === "income" ? "flex" : "hidden"}`}>
                <div className="p-3 bg-green-500/10 border-b border-green-500/20 flex items-center justify-between">
                  <h3 className="font-bold text-green-600 flex items-center gap-1.5 text-sm">
                    <Check className="h-4 w-4" />
                    INCOME (বাম পাশ - জমা)
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-green-600">Total: ৳{stats.incomeTotal.toLocaleString()}</span>
                    <Button variant="ghost" size="xs" onClick={() => handleSelectAll("income", true)} className="h-6 text-[10px] px-1.5">Select All</Button>
                    <Button variant="ghost" size="xs" onClick={() => handleSelectAll("income", false)} className="h-6 text-[10px] px-1.5 text-muted-foreground">Clear</Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-4">
                    {extractedItems.filter(item => item.type === "income").map(item => (
                      <div key={item.id} className={`p-3 rounded-lg border transition-all duration-200 ${
                        item.approved ? "border-green-500/30 bg-green-500/5" : "border-border/60 bg-muted/10 opacity-70"
                      }`}>
                        
                        {/* Transaction Header Bar */}
                        <div className="flex items-start gap-2 justify-between mb-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.id, { approved: !item.approved })}
                            className="text-primary mt-0.5 hover:scale-105 transition-transform"
                          >
                            {item.approved ? (
                              <CheckSquare className="h-4.5 w-4.5 text-green-600" />
                            ) : (
                              <Square className="h-4.5 w-4.5 text-muted-foreground" />
                            )}
                          </button>
                          
                          <div className="flex-1 px-1">
                            <Input
                              value={item.description}
                              onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                              placeholder="Description"
                              className="h-8 font-medium text-xs bg-transparent border-0 border-b border-transparent focus-visible:border-border/60 rounded-none px-0"
                            />
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Middle Controls (Amount, Payment Mode, Category) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                          <div>
                            <Label className="text-[9px] text-muted-foreground">Amount (Taka)</Label>
                            <Input
                              type="number"
                              value={item.amount}
                              onChange={(e) => handleUpdateItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                              className="h-7 text-xs px-1.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[9px] text-muted-foreground">Payment Mode</Label>
                            <Select
                              value={item.paymentMode}
                              onValueChange={(val) => {
                                const updates = { paymentMode: val };
                                if (val === "cash" && item.category === "Transfer") {
                                  updates.category = "Other Income";
                                }
                                handleUpdateItem(item.id, updates);
                              }}
                            >
                              <SelectTrigger className="h-7 text-[10px] px-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">CASH</SelectItem>
                                <SelectItem value="bank">BANK</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[9px] text-muted-foreground">Category</Label>
                            <Select
                              value={item.category}
                              onValueChange={(val) => {
                                const updates = { category: val, customerId: "none", productId: "none", loanId: "none" };
                                if (val === "Transfer") {
                                  updates.paymentMode = "bank";
                                  updates.bankFlow = "transfer_withdraw";
                                }
                                handleUpdateItem(item.id, updates);
                              }}
                            >
                              <SelectTrigger className="h-7 text-[10px] px-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Customer Payment">Customer Payment</SelectItem>
                                <SelectItem value="Partner Payment">Partner Payment</SelectItem>
                                <SelectItem value="Loan Activity">Loan Activity</SelectItem>
                                <SelectItem value="Product Activity">Product Activity</SelectItem>
                                <SelectItem value="Other Income">Other Income</SelectItem>
                                <SelectItem value="Sales">Sales</SelectItem>
                                <SelectItem value="Transfer">Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Conditional Bank Action / Direction Selector */}
                        {item.paymentMode === "bank" && (
                          <div className="mt-2 p-2 bg-muted/40 border border-border/40 rounded-md space-y-1">
                            <Label className="text-[9px] text-primary font-semibold">Bank Action / Direction (ব্যাংক লেনদেন ধরণ) *</Label>
                            <Select
                              value={item.bankFlow || "standard_bank"}
                              onValueChange={(val) => {
                                handleUpdateItem(item.id, { 
                                  bankFlow: val,
                                  category: val === "transfer_withdraw" ? "Transfer" : "Other Income"
                                });
                              }}
                            >
                              <SelectTrigger className="h-7 text-[10px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard_bank">Bank এ গেছে / Received to Bank (Income)</SelectItem>
                                <SelectItem value="transfer_withdraw">Bank থেকে আসছে / Withdraw to Cash (Transfer)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* CONDITIONAL SUB-SELECTORS */}
                        {/* 1. Customer Payment Selector */}
                        {item.category === "Customer Payment" && (
                          <div className="mt-3 p-2 bg-muted/30 border border-border/40 rounded-md space-y-1">
                            <Label className="text-[9px] text-primary font-semibold">Select Customer (গ্রাহক নির্বাচন করুন) *</Label>
                            <Select
                              value={item.customerId || "none"}
                              onValueChange={(val) => handleUpdateItem(item.id, { customerId: val })}
                            >
                              <SelectTrigger className="h-7 text-[10px]">
                                <SelectValue placeholder="Select Customer" />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="flex items-center px-2 py-1 sticky top-0 bg-popover z-10 border-b">
                                  <Search className="mr-1.5 h-3.5 w-3.5 opacity-55" />
                                  <input
                                    className="flex h-7 w-full rounded-md bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
                                    placeholder="Search customer..."
                                    value={customerSearches[item.id] || ""}
                                    onChange={(e) => setCustomerSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <SelectItem value="none" disabled>Choose customer...</SelectItem>
                                {customers
                                  .filter(c => c.name?.toLowerCase().includes((customerSearches[item.id] || "").toLowerCase()))
                                  .map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {(!item.customerId || item.customerId === "none") && (
                              <p className="text-[9px] text-red-500 flex items-center gap-1 mt-0.5"><AlertCircle className="h-2.5 w-2.5" /> Please link to a customer ledger</p>
                            )}
                          </div>
                        )}

                        {/* 2. Loan Activity Selector */}
                        {item.category === "Loan Activity" && (
                          <div className="mt-3 p-2 bg-muted/30 border border-border/40 rounded-md space-y-2">
                            <div>
                              <Label className="text-[9px] text-primary font-semibold">Select Loan Account *</Label>
                              <Select
                                value={item.loanId || "none"}
                                onValueChange={(val) => handleUpdateItem(item.id, { loanId: val })}
                              >
                                <SelectTrigger className="h-7 text-[10px]">
                                  <SelectValue placeholder="Choose loan..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none" disabled>Choose loan account...</SelectItem>
                                  {loans.map(l => (
                                    <SelectItem key={l.id} value={l.id}>{l.name} ({l.type === "GIVEN" ? "Asset" : "Liability"})</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[9px] text-primary font-semibold">Nature of Payment</Label>
                              <Select
                                value={item.loanAction}
                                onValueChange={(val) => handleUpdateItem(item.id, { loanAction: val })}
                              >
                                <SelectTrigger className="h-7 text-[10px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PRINCIPAL">Principal Amount</SelectItem>
                                  <SelectItem value="PROFIT">Profit Amount</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {(!item.loanId || item.loanId === "none") && (
                              <p className="text-[9px] text-red-500 flex items-center gap-1"><AlertCircle className="h-2.5 w-2.5" /> Link a loan account</p>
                            )}
                          </div>
                        )}

                        {/* 3. Product Activity Selector */}
                        {item.category === "Product Activity" && (
                          <div className="mt-3 p-2 bg-muted/30 border border-border/40 rounded-md space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[9px] text-primary font-semibold">Action</Label>
                                <Select
                                  value={item.productAction}
                                  onValueChange={(val) => handleUpdateItem(item.id, { productAction: val, productId: "none", supplierId: "none", selectedProducts: [] })}
                                >
                                  <SelectTrigger className="h-7 text-[10px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PARTNER_INVESTMENT">Partner Investment</SelectItem>
                                    <SelectItem value="PRODUCT_SALE">Product Sale</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {(item.productAction === "PARTNER_INVESTMENT") && (
                                <div>
                                  <Label className="text-[9px] text-primary font-semibold">Partner/Supplier</Label>
                                  <Select
                                    value={item.supplierId || "none"}
                                    onValueChange={(val) => handleUpdateItem(item.id, { supplierId: val })}
                                  >
                                    <SelectTrigger className="h-7 text-[10px]">
                                      <SelectValue placeholder="Choose partner..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <div className="flex items-center px-2 py-1 sticky top-0 bg-popover z-10 border-b">
                                        <Search className="mr-1.5 h-3.5 w-3.5 opacity-55" />
                                        <input
                                          className="flex h-7 w-full rounded-md bg-transparent text-[11px] outline-none"
                                          placeholder="Search partner..."
                                          value={supplierSearches[item.id] || ""}
                                          onChange={(e) => setSupplierSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                          onKeyDown={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                      <SelectItem value="none" disabled>Choose supplier...</SelectItem>
                                      {suppliers?.filter(s => s.name?.toLowerCase().includes((supplierSearches[item.id] || "").toLowerCase())).map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>

                            {/* Product Select */}
                            {item.productAction !== "PARTNER_PAYOUT" && (
                              <div>
                                <Label className="text-[9px] text-primary font-semibold">Product/Project</Label>
                                <Select
                                  value={item.productId || "none"}
                                  onValueChange={(val) => handleUpdateItem(item.id, { productId: val })}
                                >
                                  <SelectTrigger className="h-7 text-[10px]">
                                    <SelectValue placeholder="Select Product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="flex items-center px-2 py-1 sticky top-0 bg-popover z-10 border-b">
                                      <Search className="mr-1.5 h-3.5 w-3.5 opacity-55" />
                                      <input
                                        className="flex h-7 w-full rounded-md bg-transparent text-[11px] outline-none"
                                        placeholder="Search product..."
                                        value={productSearches[item.id] || ""}
                                        onChange={(e) => setProductSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        onKeyDown={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <SelectItem value="none" disabled>Choose product...</SelectItem>
                                    {products.filter(p => p.name?.toLowerCase().includes((productSearches[item.id] || "").toLowerCase())).map(p => (
                                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Product Sale Fields */}
                            {item.productAction === "PRODUCT_SALE" && (
                              <div className="space-y-2 border-t border-border/40 pt-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[9px]">Qty (Opt)</Label>
                                    <Input
                                      placeholder="e.g. 50"
                                      value={item.productSoldQuantity || ""}
                                      onChange={(e) => handleUpdateItem(item.id, { productSoldQuantity: e.target.value })}
                                      className="h-7 text-[11px]"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[9px]">Color (Opt)</Label>
                                    <Input
                                      placeholder="Red"
                                      value={item.productSoldColor || ""}
                                      onChange={(e) => handleUpdateItem(item.id, { productSoldColor: e.target.value })}
                                      className="h-7 text-[11px]"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-[9px]">Buyer Customer (Opt)</Label>
                                  <Select
                                    value={item.productSoldToCustomer || "none"}
                                    onValueChange={(val) => handleUpdateItem(item.id, { productSoldToCustomer: val })}
                                  >
                                    <SelectTrigger className="h-7 text-[10px]">
                                      <SelectValue placeholder="No customer (General)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <div className="flex items-center px-2 py-1 sticky top-0 bg-popover z-10 border-b">
                                        <Search className="mr-1.5 h-3.5 w-3.5 opacity-55" />
                                        <input
                                          className="flex h-7 w-full rounded-md bg-transparent text-[11px] outline-none"
                                          placeholder="Search customer..."
                                          value={productCustomerSearches[item.id] || ""}
                                          onChange={(e) => setProductCustomerSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                          onKeyDown={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                      <SelectItem value="none">General Walk-in Sale</SelectItem>
                                      {customers.filter(c => c.name?.toLowerCase().includes((productCustomerSearches[item.id] || "").toLowerCase())).map(c => (
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
                    ))}
                    {extractedItems.filter(item => item.type === "income").length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8 italic">No income transactions extracted.</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* EXPENSE COLUMN */}
              <div className={`flex-col border border-border/40 rounded-xl overflow-hidden min-h-0 bg-background/40 md:flex ${activeReviewTab === "expense" ? "flex" : "hidden"}`}>
                <div className="p-3 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
                  <h3 className="font-bold text-red-600 flex items-center gap-1.5 text-sm">
                    <Check className="h-4 w-4" />
                    EXPENSE (ডান পাশ - খরচ)
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-red-600">Total: ৳{stats.expenseTotal.toLocaleString()}</span>
                    <Button variant="ghost" size="xs" onClick={() => handleSelectAll("expense", true)} className="h-6 text-[10px] px-1.5">Select All</Button>
                    <Button variant="ghost" size="xs" onClick={() => handleSelectAll("expense", false)} className="h-6 text-[10px] px-1.5 text-muted-foreground">Clear</Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-4">
                    {extractedItems.filter(item => item.type === "expense").map(item => (
                      <div key={item.id} className={`p-3 rounded-lg border transition-all duration-200 ${
                        item.approved ? "border-red-500/30 bg-red-500/5" : "border-border/60 bg-muted/10 opacity-70"
                      }`}>
                        
                        {/* Transaction Header Bar */}
                        <div className="flex items-start gap-2 justify-between mb-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.id, { approved: !item.approved })}
                            className="text-primary mt-0.5 hover:scale-105 transition-transform"
                          >
                            {item.approved ? (
                              <CheckSquare className="h-4.5 w-4.5 text-red-600" />
                            ) : (
                              <Square className="h-4.5 w-4.5 text-muted-foreground" />
                            )}
                          </button>
                          
                          <div className="flex-1 px-1">
                            <Input
                              value={item.description}
                              onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                              placeholder="Description"
                              className="h-8 font-medium text-xs bg-transparent border-0 border-b border-transparent focus-visible:border-border/60 rounded-none px-0"
                            />
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Middle Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                          <div>
                            <Label className="text-[9px] text-muted-foreground">Amount (Taka)</Label>
                            <Input
                              type="number"
                              value={item.amount}
                              onChange={(e) => handleUpdateItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                              className="h-7 text-xs px-1.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[9px] text-muted-foreground">Payment Mode</Label>
                            <Select
                              value={item.paymentMode}
                              onValueChange={(val) => {
                                const updates = { paymentMode: val };
                                if (val === "cash" && item.category === "Transfer") {
                                  updates.category = "Other Expense";
                                }
                                handleUpdateItem(item.id, updates);
                              }}
                            >
                              <SelectTrigger className="h-7 text-[10px] px-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">CASH</SelectItem>
                                <SelectItem value="bank">BANK</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[9px] text-muted-foreground">Category</Label>
                            <Select
                              value={item.category}
                              onValueChange={(val) => {
                                const updates = { category: val, customerId: "none", productId: "none", loanId: "none" };
                                if (val === "Transfer") {
                                  updates.paymentMode = "bank";
                                  updates.bankFlow = "transfer_deposit";
                                }
                                handleUpdateItem(item.id, updates);
                              }}
                            >
                              <SelectTrigger className="h-7 text-[10px] px-1.5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Supplier Payment">Supplier Payment</SelectItem>
                                <SelectItem value="Product Activity">Product Activity</SelectItem>
                                <SelectItem value="Loan Activity">Loan Activity</SelectItem>
                                <SelectItem value="Partner Payment">Partner Payment</SelectItem>
                                <SelectItem value="Shop Expense">Shop Expense</SelectItem>
                                <SelectItem value="Own Expense">Own Expense</SelectItem>
                                <SelectItem value="Other Expense">Other Expense</SelectItem>
                                <SelectItem value="Transfer">Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Conditional Bank Action / Direction Selector */}
                        {item.paymentMode === "bank" && (
                          <div className="mt-2 p-2 bg-muted/40 border border-border/40 rounded-md space-y-1">
                            <Label className="text-[9px] text-primary font-semibold">Bank Action / Direction (ব্যাংক লেনদেন ধরণ) *</Label>
                            <Select
                              value={item.bankFlow || "standard_bank"}
                              onValueChange={(val) => {
                                handleUpdateItem(item.id, { 
                                  bankFlow: val,
                                  category: val === "transfer_deposit" ? "Transfer" : "Other Expense"
                                });
                              }}
                            >
                              <SelectTrigger className="h-7 text-[10px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard_bank">Bank থেকে গেছে / Paid from Bank (Expense)</SelectItem>
                                <SelectItem value="transfer_deposit">Bank এ গেছে / Deposit (Cash to Bank) (Transfer)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* CONDITIONAL SUB-SELECTORS */}
                        {/* 1. Loan Activity Selector */}
                        {item.category === "Loan Activity" && (
                          <div className="mt-3 p-2 bg-muted/30 border border-border/40 rounded-md space-y-2">
                            <div>
                              <Label className="text-[9px] text-primary font-semibold">Select Loan Account *</Label>
                              <Select
                                value={item.loanId || "none"}
                                onValueChange={(val) => handleUpdateItem(item.id, { loanId: val })}
                              >
                                <SelectTrigger className="h-7 text-[10px]">
                                  <SelectValue placeholder="Choose loan..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none" disabled>Choose loan account...</SelectItem>
                                  {loans.map(l => (
                                    <SelectItem key={l.id} value={l.id}>{l.name} ({l.type === "GIVEN" ? "Asset" : "Liability"})</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[9px] text-primary font-semibold">Nature of Payment</Label>
                              <Select
                                value={item.loanAction}
                                onValueChange={(val) => handleUpdateItem(item.id, { loanAction: val })}
                              >
                                <SelectTrigger className="h-7 text-[10px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PRINCIPAL">Principal Amount</SelectItem>
                                  <SelectItem value="PROFIT">Profit Amount</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {(!item.loanId || item.loanId === "none") && (
                              <p className="text-[9px] text-red-500 flex items-center gap-1"><AlertCircle className="h-2.5 w-2.5" /> Link a loan account</p>
                            )}
                          </div>
                        )}

                        {/* 2. Product Activity Selector */}
                        {item.category === "Product Activity" && (
                          <div className="mt-3 p-2 bg-muted/30 border border-border/40 rounded-md space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[9px] text-primary font-semibold">Action</Label>
                                <Select
                                  value={item.productAction}
                                  onValueChange={(val) => handleUpdateItem(item.id, { productAction: val, productId: "none", supplierId: "none", selectedProducts: [] })}
                                >
                                  <SelectTrigger className="h-7 text-[10px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PRODUCT_COST">Product Cost</SelectItem>
                                    <SelectItem value="OTHER_EXPENSE">Other Expense</SelectItem>
                                    <SelectItem value="PARTNER_PAYOUT">Partner Payout</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {(item.productAction === "PARTNER_PAYOUT") && (
                                <div>
                                  <Label className="text-[9px] text-primary font-semibold">Partner/Supplier</Label>
                                  <Select
                                    value={item.supplierId || "none"}
                                    onValueChange={(val) => handleUpdateItem(item.id, { supplierId: val })}
                                  >
                                    <SelectTrigger className="h-7 text-[10px]">
                                      <SelectValue placeholder="Choose partner..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <div className="flex items-center px-2 py-1 sticky top-0 bg-popover z-10 border-b">
                                        <Search className="mr-1.5 h-3.5 w-3.5 opacity-55" />
                                        <input
                                          className="flex h-7 w-full rounded-md bg-transparent text-[11px] outline-none"
                                          placeholder="Search partner..."
                                          value={supplierSearches[item.id] || ""}
                                          onChange={(e) => setSupplierSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                          onKeyDown={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                      <SelectItem value="none" disabled>Choose supplier...</SelectItem>
                                      {suppliers?.filter(s => s.name?.toLowerCase().includes((supplierSearches[item.id] || "").toLowerCase())).map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>

                            {/* Product Select (Single or Multi Payout) */}
                            {item.productAction !== "PARTNER_PAYOUT" ? (
                              <div>
                                <Label className="text-[9px] text-primary font-semibold">Product/Project</Label>
                                <Select
                                  value={item.productId || "none"}
                                  onValueChange={(val) => handleUpdateItem(item.id, { productId: val })}
                                >
                                  <SelectTrigger className="h-7 text-[10px]">
                                    <SelectValue placeholder="Select Product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="flex items-center px-2 py-1 sticky top-0 bg-popover z-10 border-b">
                                      <Search className="mr-1.5 h-3.5 w-3.5 opacity-55" />
                                      <input
                                        className="flex h-7 w-full rounded-md bg-transparent text-[11px] outline-none"
                                        placeholder="Search product..."
                                        value={productSearches[item.id] || ""}
                                        onChange={(e) => setProductSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        onKeyDown={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <SelectItem value="none" disabled>Choose product...</SelectItem>
                                    {products.filter(p => p.name?.toLowerCase().includes((productSearches[item.id] || "").toLowerCase())).map(p => (
                                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <div>
                                <Label className="text-[9px] text-primary font-semibold">Select Product(s) for Payout</Label>
                                <Select
                                  value="none"
                                  onValueChange={(val) => {
                                    if (val !== "none" && !item.selectedProducts.includes(val)) {
                                      handleUpdateItem(item.id, { selectedProducts: [...item.selectedProducts, val] });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-[10px]">
                                    <SelectValue placeholder="Add product..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="flex items-center px-2 py-1 sticky top-0 bg-popover z-10 border-b">
                                      <Search className="mr-1.5 h-3.5 w-3.5 opacity-55" />
                                      <input
                                        className="flex h-7 w-full rounded-md bg-transparent text-[11px] outline-none"
                                        placeholder="Search product..."
                                        value={productSearches[item.id] || ""}
                                        onChange={(e) => setProductSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        onKeyDown={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <SelectItem value="none" disabled>Add product to list...</SelectItem>
                                    {products
                                      .filter(p => p.name?.toLowerCase().includes((productSearches[item.id] || "").toLowerCase()) && !item.selectedProducts.includes(p.id))
                                      .map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {item.selectedProducts.map(pid => {
                                    const pObj = products.find(p => p.id === pid);
                                    return (
                                      <Badge key={pid} variant="secondary" className="text-[9px] py-0.5 px-1.5 flex items-center gap-1 bg-muted">
                                        {pObj?.name}
                                        <X className="h-2.5 w-2.5 cursor-pointer hover:text-destructive" onClick={() => handleUpdateItem(item.id, { selectedProducts: item.selectedProducts.filter(id => id !== pid) })} />
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {extractedItems.filter(item => item.type === "expense").length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8 italic">No expense transactions extracted.</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

            </div>

            {/* Bottom Actions Bar */}
            <div className="flex justify-between items-center pt-4 border-t border-border/40 mt-4">
              <Button variant="outline" size="sm" onClick={() => {
                setExtractedItems([]);
                setImageFile(null);
                setImagePreview("");
                setStep(1);
              }}>
                Cancel / Clear
              </Button>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 text-white font-bold"
                onClick={handleBatchImport}
              >
                Import Checked (অনুমোদিত হিসাব যোগ করুন)
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: BATCH IMPORT PROGRESS BAR */}
        {step === 4 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-6">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <div className="w-full max-w-md space-y-2 text-center">
              <h3 className="font-semibold">Importing Transactions to Database...</h3>
              <p className="text-xs text-muted-foreground">{importProgress.status}</p>
              <Progress value={(importProgress.current / importProgress.total) * 100} className="h-2" />
              <p className="text-[10px] text-muted-foreground">
                Item {importProgress.current} of {importProgress.total}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

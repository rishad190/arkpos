"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, Plus, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useToast } from "@/hooks/use-toast";

export function CashTransactionDialog({
  transaction,
  onTransactionSubmit,
  children,
  expenseCategories,
  onAddCategory,
  open,
  onOpenChange,
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [saveAccount, setSaveAccount] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const mode = transaction ? "edit" : "add";

  useEffect(() => {
    const initialFormData = {
      date: new Date().toISOString().split("T")[0],
      description: "",
      reference: "",
      cashIn: "",
      cashOut: "",
      category: "",
      transactionType: "regular",
    };
    if (open) {
      setFormData(transaction || initialFormData);
    }
  }, [transaction, open]);

  // Load saved bank accounts from localStorage
  useEffect(() => {
    const savedAccounts = localStorage.getItem("savedBankAccounts");
    if (savedAccounts) {
      setSavedAccounts(JSON.parse(savedAccounts));
    }
  }, []);

  const handleSaveAccount = () => {
    if (!formData.bankName || !formData.bankAccount || !formData.accountName) {
      setErrors({
        bankAccount: "Please fill in all bank account details to save",
      });
      return;
    }

    const newAccount = {
      id: Date.now().toString(),
      bankName: formData.bankName,
      accountNumber: formData.bankAccount,
      accountName: formData.accountName,
    };

    const updatedAccounts = [...savedAccounts, newAccount];
    setSavedAccounts(updatedAccounts);
    localStorage.setItem("savedBankAccounts", JSON.stringify(updatedAccounts));
    setShowAddAccount(false);
    setSaveAccount(false);
    toast({
      title: "Success",
      description: "Bank account saved successfully",
    });
  };

  const handleSelectAccount = (account) => {
    setFormData((prev) => ({
      ...prev,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.description?.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.cashIn && !formData.cashOut) {
      newErrors.amount = "Either Cash In or Cash Out is required";
    }

    if (formData.cashOut && !formData.category) {
      newErrors.category = "Category is required for Cash Out transactions";
    }

    // Validate numeric values
    if (
      formData.cashIn &&
      (isNaN(formData.cashIn) || parseFloat(formData.cashIn) < 0)
    ) {
      newErrors.cashIn = "Please enter a valid amount";
    }

    if (
      formData.cashOut &&
      (isNaN(formData.cashOut) || parseFloat(formData.cashOut) < 0)
    ) {
      newErrors.cashOut = "Please enter a valid amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const transactionData = {
        ...formData,
        cashIn: parseFloat(formData.cashIn) || 0,
        cashOut: parseFloat(formData.cashOut) || 0,
        category: formData.cashOut ? formData.category : "Income",
      };

      await onTransactionSubmit(transactionData);

      if (mode === "add") {
        // Reset form for adding another transaction
        setFormData((prev) => ({
          date: prev.date,
          description: "",
          reference: "",
          cashIn: "",
          cashOut: "",
          category: "",
          transactionType: "regular",
        }));
        toast({
          title: "Success",
          description: "Transaction added successfully.",
        });
      } else {
        onOpenChange(false); // Close dialog on successful edit
        toast({
          title: "Success",
          description: "Transaction updated successfully.",
        });
      }
      setErrors({});
    } catch (error) {
      console.error(
        `Error ${mode === "add" ? "adding" : "updating"} transaction:`,
        error
      );
      setErrors({ submit: `Failed to ${mode} transaction. Please try again.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (type, value) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [type]: value,
      };

      // Clear the other amount
      if (type === "cashIn") {
        newData.cashOut = "";
        newData.category = "";
      } else {
        newData.cashIn = "";
      }

      return newData;
    });
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      setErrors({ category: "Category name is required" });
      return;
    }

    if (expenseCategories.includes(newCategory.trim())) {
      setErrors({ category: "This category already exists" });
      return;
    }

    try {
      await onAddCategory(newCategory.trim());
      setFormData((prev) => ({ ...prev, category: newCategory.trim() }));
      setNewCategory("");
      setShowAddCategory(false);
      setErrors({});
    } catch (error) {
      setErrors({ category: "Failed to add category. Please try again." });
    }
  };

  // Add transaction type options
  const transactionTypes = [
    { value: "regular", label: "Regular" },
    { value: "sales", label: "Sales" },
    { value: "advance", label: "Advance" },
    { value: "from_bank", label: "From Bank" },
    { value: "other", label: "Other" },
  ];
  const dialogContent = (
    <DialogContent
      className="sm:max-w-[425px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-dialog-title"
    >
      <DialogHeader>
        <DialogTitle id="transaction-dialog-title">
          {mode === "add" ? "Add" : "Edit"} Transaction
        </DialogTitle>
        <DialogDescription>
          Enter the transaction details below.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date: e.target.value }))
              }
              required
              className={errors.date ? "border-red-500" : ""}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reference: e.target.value,
                }))
              }
              placeholder="Optional reference"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Enter transaction description"
            required
            className={errors.description ? "border-red-500" : ""}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cashIn">Cash In</Label>
            <Input
              id="cashIn"
              type="number"
              value={formData.cashIn}
              onChange={(e) => handleAmountChange("cashIn", e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={errors.cashIn ? "border-red-500" : ""}
            />
            {errors.cashIn && (
              <p className="text-sm text-red-500">{errors.cashIn}</p>
            )}
            {formData.cashIn && (
              <Select
                value={formData.transactionType}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, transactionType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cashOut">Cash Out</Label>
            <Input
              id="cashOut"
              type="number"
              value={formData.cashOut}
              onChange={(e) => handleAmountChange("cashOut", e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={errors.cashOut ? "border-red-500" : ""}
            />
            {errors.cashOut && (
              <p className="text-sm text-red-500">{errors.cashOut}</p>
            )}
          </div>
        </div>

        {errors.amount && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.amount}</AlertDescription>
          </Alert>
        )}

        {formData.cashOut && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category">Category</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddCategory(true)}
                className="h-8 px-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Category
              </Button>
            </div>
            {showAddCategory ? (
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter new category"
                  className={errors.category ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCategory}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategory("");
                    setErrors({});
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger
                  id="category"
                  className={errors.category ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ Add New Category</SelectItem>
                </SelectContent>
              </Select>
            )}
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category}</p>
            )}
          </div>
        )}

        {errors.submit && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.submit}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "add" ? "Adding..." : "Saving..."}
              </>
            ) : mode === "add" ? (
              "Add Transaction"
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (mode === "add") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {dialogContent}
    </Dialog>
  );
}

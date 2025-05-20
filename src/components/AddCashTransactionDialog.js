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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function AddCashTransactionDialog({
  onAddTransaction,
  children,
  expenseCategories,
  onAddCategory,
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [saveAccount, setSaveAccount] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
    cashIn: "",
    cashOut: "",
    category: "",
    transactionType: "cash",
    bankName: "",
    bankAccount: "",
    accountName: "",
  });
  const [errors, setErrors] = useState({});

  // Load saved bank accounts from localStorage
  useEffect(() => {
    const savedAccounts = localStorage.getItem("savedBankAccounts");
    if (savedAccounts) {
      setSavedAccounts(JSON.parse(savedAccounts));
    }
  }, []);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
        cashIn: "",
        cashOut: "",
        category: "",
        transactionType: "cash",
        bankName: "",
        bankAccount: "",
        accountName: "",
      });
      setErrors({});
      setNewCategory("");
      setShowAddCategory(false);
      setShowAddAccount(false);
      setSaveAccount(false);
    }
  }, [open]);

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
      bankAccount: account.accountNumber,
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

    if (
      formData.cashOut &&
      !formData.category &&
      formData.transactionType === "cash"
    ) {
      newErrors.category = "Category is required for Cash Out transactions";
    }

    // Validate bank details for bank transactions
    if (formData.transactionType !== "cash") {
      if (!formData.bankName?.trim()) {
        newErrors.bankName = "Bank name is required";
      }
      if (!formData.bankAccount?.trim()) {
        newErrors.bankAccount = "Bank account is required";
      }
      if (showAddAccount && !formData.accountName?.trim()) {
        newErrors.accountName = "Account name is required";
      }
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
        category:
          formData.transactionType === "cash" && formData.cashOut
            ? formData.category
            : "Income",
        isBankTransaction: formData.transactionType !== "cash",
        bankDetails:
          formData.transactionType !== "cash"
            ? {
                bankName: formData.bankName,
                accountNumber: formData.bankAccount,
                accountName: formData.accountName,
              }
            : null,
      };

      await onAddTransaction(transactionData);
      setOpen(false);
    } catch (error) {
      console.error("Error adding transaction:", error);
      setErrors({ submit: "Failed to add transaction. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransactionTypeChange = (value) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        transactionType: value,
      };

      // Reset bank fields when switching to cash
      if (value === "cash") {
        newData.bankName = "";
        newData.bankAccount = "";
        newData.accountName = "";
      }

      // Handle bank deposit
      if (value === "bank_deposit") {
        newData.cashOut = "";
        newData.category = "";
      }

      // Handle bank withdrawal
      if (value === "bank_withdrawal") {
        newData.cashIn = "";
      }

      return newData;
    });
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
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
            <Label>Transaction Type</Label>
            <RadioGroup
              value={formData.transactionType}
              onValueChange={handleTransactionTypeChange}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash">Cash</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_deposit" id="bank_deposit" />
                <Label htmlFor="bank_deposit">Bank Deposit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_withdrawal" id="bank_withdrawal" />
                <Label htmlFor="bank_withdrawal">Bank Withdrawal</Label>
              </div>
            </RadioGroup>
          </div>

          {(formData.transactionType === "bank_deposit" ||
            formData.transactionType === "bank_withdrawal") && (
            <div className="space-y-4">
              {savedAccounts.length > 0 && !showAddAccount ? (
                <div className="space-y-2">
                  <Label>Select Saved Account</Label>
                  <Select
                    onValueChange={(value) =>
                      handleSelectAccount(
                        savedAccounts.find((acc) => acc.id === value)
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved account" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bankName} - {account.accountName} (
                          {account.accountNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddAccount(true)}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Add New Account</Label>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="save-account" className="text-sm">
                        Save Account
                      </Label>
                      <Switch
                        id="save-account"
                        checked={saveAccount}
                        onCheckedChange={setSaveAccount}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          accountName: e.target.value,
                        }))
                      }
                      placeholder="Enter account name"
                      className={errors.accountName ? "border-red-500" : ""}
                    />
                    {errors.accountName && (
                      <p className="text-sm text-red-500">
                        {errors.accountName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bankName: e.target.value,
                        }))
                      }
                      placeholder="Enter bank name"
                      className={errors.bankName ? "border-red-500" : ""}
                    />
                    {errors.bankName && (
                      <p className="text-sm text-red-500">{errors.bankName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Account Number</Label>
                    <Input
                      id="bankAccount"
                      value={formData.bankAccount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bankAccount: e.target.value,
                        }))
                      }
                      placeholder="Enter account number"
                      className={errors.bankAccount ? "border-red-500" : ""}
                    />
                    {errors.bankAccount && (
                      <p className="text-sm text-red-500">
                        {errors.bankAccount}
                      </p>
                    )}
                  </div>

                  {saveAccount && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveAccount}
                      className="w-full"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Account
                    </Button>
                  )}

                  {savedAccounts.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowAddAccount(false)}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

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

          {formData.cashOut && formData.transactionType === "cash" && (
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
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Transaction"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

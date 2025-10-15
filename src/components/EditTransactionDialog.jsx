"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { FormField } from "@/components/ui/form-field";
import { useForm } from "@/hooks/use-form";
import { COLLECTION_REFS, TRANSACTION_CONSTANTS } from "@/lib/constants";

/**
 * Dialog component for editing a transaction
 */
export function EditTransactionDialog({
  transaction,
  onEditTransaction,
  customerName,
}) {
  // Validation function for transaction data
  const validateTransaction = (data) => {
    const newErrors = {};

    // Required field validations
    if (!data.date) {
      newErrors.date = "Date is required";
    }

    // Memo number validation
    const trimmedMemo = data.memoNumber?.trim();
    if (!trimmedMemo) {
      newErrors.memoNumber = "Memo number is required";
    }

    // Amount validations
    const totalAmount = parseFloat(data.total);
    const depositAmount = parseFloat(data.deposit);

    if (isNaN(totalAmount) || totalAmount < 0) {
      newErrors.total = "Please enter a valid amount";
    }

    if (isNaN(depositAmount) || depositAmount < 0) {
      newErrors.deposit = "Please enter a valid deposit amount";
    }

    return newErrors;
  };

  // Initialize form with useForm hook
  const {
    formData,
    errors,
    handleChange,
    handleSubmit,
    setFormData,
    setField,
  } = useForm(
    // Initial form data - will be overridden by useEffect
    {
      date: new Date().toISOString().split("T")[0],
      memoNumber: "",
      details: "",
      total: "0",
      deposit: "0",
      storeId: "STORE1",
      customerId: "",
    },
    validateTransaction,
    // Submit handler
    async (data) => {
      try {
        // Parse numeric values
        const totalAmount = parseFloat(data.total);
        const depositAmount = parseFloat(data.deposit);

        if (isNaN(totalAmount) || isNaN(depositAmount)) {
          throw new Error("Invalid amount values");
        }

        // Create the sanitized data object
        const sanitizedData = {
          date: data.date,
          memoNumber: data.memoNumber.trim() || transaction.memoNumber,
          details: data.details.trim(),
          total: totalAmount,
          deposit: depositAmount,
          due: totalAmount - depositAmount,
          storeId: data.storeId,
          customerId: transaction.customerId,
          id: transaction.id,
          updatedAt: new Date().toISOString(),
        };

        await onEditTransaction(sanitizedData);
        return true;
      } catch (error) {
        throw new Error(error.message || "Failed to update transaction");
      }
    }
  );

  // Update form data when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        date: transaction.date || new Date().toISOString().split("T")[0],
        memoNumber: transaction.memoNumber || "",
        details: transaction.details || "",
        total:
          typeof transaction.total === "number"
            ? transaction.total.toString()
            : "0",
        deposit:
          typeof transaction.deposit === "number"
            ? transaction.deposit.toString()
            : "0",
        storeId: transaction.storeId || "STORE1",
        customerId: transaction.customerId || "",
      });
    }
  }, [transaction, setFormData]);

  // Store options for the select field
  const storeOptions = [
    { value: "STORE1", label: "Store 1" },
    { value: "STORE2", label: "Store 2" },
  ];

  return (
    <FormDialog
      title={`Edit Transaction for ${customerName}`}
      trigger={
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      }
      onSubmit={handleSubmit}
      submitText="Update Transaction"
    >
      <FormField
        label="Date"
        name="date"
        type="date"
        value={formData.date}
        onChange={handleChange}
        error={errors.date}
        required
      />

      <FormField
        label="Memo Number"
        name="memoNumber"
        value={formData.memoNumber}
        onChange={handleChange}
        error={errors.memoNumber}
        required
        placeholder="Enter memo number"
      />

      <FormField
        label="Details"
        name="details"
        value={formData.details}
        onChange={handleChange}
        placeholder="Enter transaction details"
      />

      <FormField
        label="Total Bill"
        name="total"
        type="number"
        value={formData.total}
        onChange={handleChange}
        error={errors.total}
        min="0"
        step="0.01"
        placeholder="Enter total amount"
      />

      <FormField
        label="Deposit"
        name="deposit"
        type="number"
        value={formData.deposit}
        onChange={handleChange}
        error={errors.deposit}
        min="0"
        step="0.01"
        placeholder="Enter deposit amount"
      />

      <FormField
        label="Store"
        name="storeId"
        type="select"
        value={formData.storeId}
        onChange={handleChange}
        options={storeOptions}
      />

      {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}
    </FormDialog>
  );
}

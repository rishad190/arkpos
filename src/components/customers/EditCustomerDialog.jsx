"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { FormField } from "@/components/ui/form-field";
import { useForm } from "@/hooks/use-form";
// import { useFirebaseCrud } from "@/hooks/use-firebase-crud"; // Removed
import { COLLECTION_REFS } from "@/lib/constants";

/**
 * Dialog component for editing a customer
 */
export function EditCustomerDialog({
  customer,
  onEditCustomer,
  isOpen,
  onClose,
}) {
  // Validation function
  const validateCustomer = (data) => {
    const errors = {};
    if (!data.name?.trim()) errors.name = "Name is required";
    if (!data.phone?.trim()) errors.phone = "Phone is required";
    return errors;
  };

  // Set up the form with useForm hook
  const { formData, errors, handleChange, handleSubmit, setFormData } = useForm(
    {
      name: "",
      phone: "",
      address: "",
      email: "",
      storeId: "STORE1",
    },
    validateCustomer,
    async (data) => {
      // Submit the edited customer data
      await onEditCustomer(customer?.id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      onClose?.();
      return true;
    }
  );

  // Update form data when customer changes
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        address: customer.address || "",
        email: customer.email || "",
        storeId: customer.storeId || "STORE1",
      });
    }
  }, [customer, setFormData]);

  // Store options for the select field
  const storeOptions = [
    { value: "STORE1", label: "Store 1" },
    { value: "STORE2", label: "Store 2" },
  ];

  return (
    <FormDialog
      title="Edit Customer"
      onSubmit={handleSubmit}
      open={isOpen}
      onOpenChange={onClose}
      submitText="Update Customer"
    >
      <FormField
        label="Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        required
        placeholder="Enter customer name"
      />

      <FormField
        label="Phone"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        error={errors.phone}
        required
        placeholder="Enter phone number"
      />

      <FormField
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Enter email address"
      />

      <FormField
        label="Address"
        name="address"
        value={formData.address}
        onChange={handleChange}
        placeholder="Enter address"
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

"use client";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { FormField } from "@/components/ui/form-field";
import { useForm } from "@/hooks/use-form";
import { useData } from "@/app/data-context";
import { useFirebaseCrud } from "@/hooks/use-firebase-crud";
import { COLLECTION_REFS } from "@/lib/constants";

/**
 * Dialog component for adding a new customer
 */
export function AddCustomerDialog({ onClose }) {
  const { addCustomer } = useData();
  const customerCrud = useFirebaseCrud(COLLECTION_REFS.CUSTOMERS, {
    successMessages: {
      create: "Customer added successfully",
    },
    errorMessages: {
      create: "Failed to add customer. Please try again.",
    },
  });

  // Store options for the select field
  const storeOptions = [
    { value: "STORE1", label: "Store 1" },
    { value: "STORE2", label: "Store 2" },
  ];

  // Validation function
  const validateCustomer = (data) => {
    const errors = {};
    if (!data.name?.trim()) errors.name = "Name is required";
    if (!data.phone?.trim()) errors.phone = "Phone is required";
    if (!data.storeId) errors.storeId = "Store is required";
    return errors;
  };

  // Form state management with useForm hook
  const { formData, errors, handleChange, handleSubmit } = useForm(
    {
      name: "",
      phone: "",
      email: "",
      address: "",
      storeId: "STORE1",
    },
    validateCustomer,
    async (data) => {
      try {
        // Use customerCrud hook instead of direct context call
        await customerCrud.create({
          ...data,
          createdAt: new Date().toISOString(),
        });
        onClose?.();
      } catch (error) {
        throw new Error(error.message || "Failed to add customer");
      }
    }
  );

  return (
    <FormDialog
      title="Add New Customer"
      trigger={<Button>Add New Customer</Button>}
      onSubmit={handleSubmit}
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
        error={errors.storeId}
        required
        options={storeOptions}
      />

      {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}
    </FormDialog>
  );
}

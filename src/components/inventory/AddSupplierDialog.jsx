import { useInventory } from "@/contexts/inventory-context";
import { COLLECTION_REFS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { FormField } from "@/components/ui/form-field";
import { useForm } from "@/hooks/use-form";

/**
 * Dialog component for adding a new supplier
 */
export function AddSupplierDialog({ onClose }) {
  const { addSupplier } = useInventory();

  const storeOptions = [
    { value: "STORE1", label: "Store 1" },
    { value: "STORE2", label: "Store 2" },
  ];

  const validateSupplier = (data) => {
    const errors = {};
    if (!data.name?.trim()) errors.name = "Name is required";
    if (!data.phone?.trim()) errors.phone = "Phone is required";
    return errors;
  };

  const { formData, errors, handleChange, handleSubmit } = useForm(
    {
      name: "",
      phone: "",
      email: "",
      address: "",
      storeId: "STORE1",
      totalDue: 0,
    },
    validateSupplier,
    async (data) => {
      try {
        await addSupplier({
          ...data,
          createdAt: new Date().toISOString(),
        });
        onClose?.();
      } catch (error) {
        throw new Error(error.message || "Failed to add supplier");
      }
    }
  );

  return (
    <FormDialog
      title="Add New Supplier"
      trigger={<Button>+ Add Supplier</Button>}
      onSubmit={handleSubmit}
    >
      <FormField
        label="Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        required
        placeholder="Enter supplier name"
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
        placeholder="Enter supplier address"
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
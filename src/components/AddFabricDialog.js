"use client";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { FormField } from "@/components/ui/form-field";
import { useForm } from "@/hooks/use-form";
import { useFirebaseCrud } from "@/hooks/use-firebase-crud";
import { COLLECTION_REFS, FABRIC_CONSTANTS } from "@/lib/constants";

/**
 * Dialog component for adding a new fabric
 */
export function AddFabricDialog({ onAddFabric }) {
  // Validation function
  const validateFabric = (data) => {
    const errors = {};
    if (!data.code?.trim()) errors.code = "Code is required";
    if (!data.name?.trim()) errors.name = "Name is required";
    if (!data.unit) errors.unit = "Unit is required";
    if (!data.category) errors.category = "Category is required";
    return errors;
  };

  // Form state management with useForm hook
  const { formData, errors, handleChange, handleSubmit } = useForm(
    {
      code: "",
      name: "",
      description: "",
      unit: "METER",
      category: "COTTON",
    },
    validateFabric,
    async (data) => {
      // Submit the fabric data
      await onAddFabric({
        ...data,
        code: data.code.toUpperCase(),
        createdAt: new Date().toISOString(),
      });
      return true;
    }
  );

  return (
    <FormDialog
      title="Add New Fabric"
      trigger={<Button>+ New Fabric</Button>}
      onSubmit={handleSubmit}
      submitText="Add Fabric"
    >
      <FormField
        label="Fabric Code"
        name="code"
        value={formData.code}
        onChange={handleChange}
        error={errors.code}
        required
        placeholder="Enter fabric code"
      />

      <FormField
        label="Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        required
        placeholder="Enter fabric name"
      />

      <FormField
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Enter description"
      />

      <FormField
        label="Unit"
        name="unit"
        type="select"
        value={formData.unit}
        onChange={handleChange}
        error={errors.unit}
        required
        options={FABRIC_CONSTANTS.UNITS}
      />

      <FormField
        label="Category"
        name="category"
        type="select"
        value={formData.category}
        onChange={handleChange}
        error={errors.category}
        required
        options={FABRIC_CONSTANTS.CATEGORIES}
      />

      {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}
    </FormDialog>
  );
}

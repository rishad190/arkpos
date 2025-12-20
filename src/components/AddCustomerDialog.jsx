"use client";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { FormField } from "@/components/ui/form-field";
import { useForm } from "@/hooks/use-form";
import { useFirebaseCrud } from "@/hooks/use-firebase-crud";
import { COLLECTION_REFS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

/**
 * Dialog component for adding a new customer
 */
export function AddCustomerDialog({ open, onOpenChange, onClose }) {
  const [customTag, setCustomTag] = useState("");

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

  // Predefined fabric tags
  const fabricTags = [
    "Cotton",
    "Silk",
    "Wool",
    "Linen",
    "Denim",
    "Leather",
    "Synthetic",
    "Knit",
    "Woven",
    "Embroidered",
    "Printed",
    "Plain",
    "Designer",
    "Traditional",
    "Modern",
  ];

  // Validation function
  const validateCustomer = (data) => {
    const errors = {};
    if (!data.name?.trim()) errors.name = "Name is required";

    // Enhanced phone validation
    if (!data.phone?.trim()) {
      errors.phone = "Phone is required";
    } else {
      const phoneRegex = /^[0-9]{11}$/;
      if (!phoneRegex.test(data.phone)) {
        errors.phone = "Phone number must be exactly 11 digits";
      }
    }

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
      tags: [], // Initialize empty tags array
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
        return true;
      } catch (error) {
        throw new Error(error.message || "Failed to add customer");
      }
    }
  );

  // Handle adding custom tag
  const handleAddCustomTag = () => {
    if (customTag.trim() && !formData.tags?.includes(customTag.trim())) {
      handleChange({
        target: {
          name: "tags",
          value: [...(formData.tags || []), customTag.trim()],
        },
      });
      setCustomTag(""); // Clear input after adding
    }
  };

  // Handle tag selection
  const handleTagChange = (tag) => {
    const currentTags = formData.tags || [];
    if (currentTags.includes(tag)) {
      handleChange({
        target: {
          name: "tags",
          value: currentTags.filter((t) => t !== tag),
        },
      });
    } else {
      handleChange({
        target: {
          name: "tags",
          value: [...currentTags, tag],
        },
      });
    }
  };

  // Handle key press for custom tag input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomTag();
    }
  };

  return (
    <FormDialog
      title="Add New Customer"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={onOpenChange}
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
        placeholder="Enter 11-digit phone number"
        type="tel"
        maxLength={11}
        pattern="[0-9]{11}"
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

      {/* Tags Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Fabric Preferences</label>

        {/* Custom Tag Input */}
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="Add custom tag..."
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddCustomTag}
            disabled={!customTag.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected Tags */}
        {formData.tags?.length > 0 && (
          <div className="mb-2">
            <p className="text-sm text-muted-foreground mb-1">Selected Tags:</p>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="default"
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => handleTagChange(tag)}
                >
                  {tag}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Predefined Tags */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Common Tags:</p>
          <div className="flex flex-wrap gap-2">
            {fabricTags.map((tag) => (
              <Badge
                key={tag}
                variant={formData.tags?.includes(tag) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => handleTagChange(tag)}
              >
                {tag}
                {formData.tags?.includes(tag) && <X className="ml-1 h-3 w-3" />}
              </Badge>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Click to select/deselect fabric preferences or add your own tags
        </p>
      </div>

      {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}
    </FormDialog>
  );
}

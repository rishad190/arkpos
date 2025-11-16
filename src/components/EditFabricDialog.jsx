"use client";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EditFabricDialog({ fabric, onSave, onDelete }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: fabric?.code || "",
    name: fabric?.name || "",
    description: fabric?.description || "",
    unit: fabric?.unit || "METER",
    category: fabric?.category || "COTTON",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.code?.trim()) newErrors.code = "Code is required";
    if (!formData.name?.trim()) newErrors.name = "Name is required";
    if (!formData.unit) newErrors.unit = "Unit is required";
    if (!formData.category) newErrors.category = "Category is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSave(fabric.id, {
        ...formData,
        code: formData.code.toUpperCase(),
        updatedAt: new Date().toISOString(),
      });
      setOpen(false);
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(fabric.id);
      setOpen(false);
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setErrors({});
      }}
    >
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit Fabric Details</DialogTitle>
        </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="max-h-[60vh] overflow-y-auto pr-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fabric Code *</label>
                      <Input
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({ ...formData, code: e.target.value })
                        }
                        className={errors.code ? "border-red-500" : ""}
                        placeholder="Enter fabric code"
                      />
                      {errors.code && (
                        <p className="text-sm text-red-500">{errors.code}</p>
                      )}
                    </div>
        
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className={errors.name ? "border-red-500" : ""}
                        placeholder="Enter fabric name"
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500">{errors.name}</p>
                      )}
                    </div>
        
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Enter description"
                      />
                    </div>
        
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unit *</label>
                      <Select
                        value={formData.unit}
                        onValueChange={(value) =>
                          setFormData({ ...formData, unit: value })
                        }
                      >
                        <SelectTrigger className={errors.unit ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="METER">Meter</SelectItem>
                          <SelectItem value="YARD">Yard</SelectItem>
                          <SelectItem value="PIECE">Piece</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.unit && (
                        <p className="text-sm text-red-500">{errors.unit}</p>
                      )}
                    </div>
        
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category *</label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger
                          className={errors.category ? "border-red-500" : ""}
                        >
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COTTON">Cotton</SelectItem>
                          <SelectItem value="POLYESTER">Polyester</SelectItem>
                          <SelectItem value="MIXED">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.category && (
                        <p className="text-sm text-red-500">{errors.category}</p>
                      )}
                    </div>
        
                    {errors.submit && (
                      <p className="text-sm text-red-500">{errors.submit}</p>
                    )}
                  </div>
        
                  <div className="flex justify-between">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive">
                          Delete Fabric
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete
                            the fabric and all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </div>
                  </div>
                </form>
      </DialogContent>
    </Dialog>
  );
}

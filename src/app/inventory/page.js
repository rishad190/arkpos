"use client";
import React, { useState, useMemo, Suspense } from "react";
import logger from "@/utils/logger";
import { useRouter } from "next/navigation";
import { useInventoryStore } from "@/store/inventoryStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InventoryErrorBoundary } from "@/components/ErrorBoundary";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { calculateTotalQuantity } from "@/lib/inventory-utils";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import heavy components
const FabricForm = dynamic(() => import("../../components/FabricForm.jsx"), {
  loading: () => (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="mt-2 text-sm text-muted-foreground">Loading form...</p>
    </div>
  ),
  ssr: false,
});

export default function InventoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    fabrics,
    addFabric,
    updateFabric,
    deleteFabric,
    addFabricBatch,
    updateFabricBatch,
  } = useInventoryStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFabric, setEditingFabric] = useState(null);

  const filteredFabrics = useMemo(() => {
    if (!Array.isArray(fabrics)) return [];

    return fabrics.filter((fabric) => {
      if (!fabric) return false;
      const searchString = searchTerm.toLowerCase();
      return (
        fabric.name?.toLowerCase().includes(searchString) ||
        fabric.code?.toLowerCase().includes(searchString) ||
        fabric.category?.toLowerCase().includes(searchString)
      );
    });
  }, [fabrics, searchTerm]);

  const handleAddClick = () => {
    setEditingFabric(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (fabric) => {
    setEditingFabric(fabric);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (fabricId) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteFabric(fabricId);
        toast({
          title: "Success",
          description: "Fabric deleted successfully",
        });
      } catch (error) {
        logger.error("Error deleting fabric:", error);
        toast({
          title: "Error",
          description: "Failed to delete fabric. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveFabric = async (fabric) => {
    try {
      // Separate fabric data from batches
      const { batches, ...fabricData } = fabric;

      if (fabric.id) {
        // Update existing fabric
        await updateFabric(fabric.id, {
          ...fabricData,
          updatedAt: new Date().toISOString(),
        });

        // Update batches if they exist
        if (batches && batches.length > 0) {
          for (const batch of batches) {
            if (batch.id && batch.id.startsWith("b")) {
              // This is a temporary ID, create new batch
              const { id, ...batchData } = batch;
              await addFabricBatch({
                ...batchData,
                fabricId: fabric.id,
                createdAt: new Date().toISOString(),
              });
            } else {
              // This is an existing batch, update it
              await updateFabricBatch(batch.id, {
                ...batch,
                fabricId: fabric.id,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }

        toast({
          title: "Success",
          description: "Fabric updated successfully",
        });
      } else {
        // Add new fabric
        const fabricId = await addFabric({
          ...fabricData,
          createdAt: new Date().toISOString(),
        });

        // Add batches if they exist
        if (batches && batches.length > 0) {
          for (const batch of batches) {
            const { id, ...batchData } = batch;
            await addFabricBatch({
              ...batchData,
              fabricId: fabricId,
              createdAt: new Date().toISOString(),
            });
          }
        }

        toast({
          title: "Success",
          description: "Fabric added successfully",
        });
      }
      setIsDialogOpen(false);
      setEditingFabric(null);
    } catch (error) {
      logger.error("Error saving fabric:", error);
      toast({
        title: "Error",
        description: "Failed to save fabric. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <InventoryErrorBoundary>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <Card className="border-none shadow-md">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-3xl font-bold tracking-tight">
                  Fabric Inventory
                </CardTitle>
                <CardDescription className="mt-1">
                  Manage your fabric stock here.
                </CardDescription>
              </div>
              <Button
                onClick={handleAddClick}
                className="bg-primary hover:bg-primary/90 text-white w-full md:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Fabric
              </Button>
            </div>

            <div className="mt-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFabrics.map((fabric) => (
                  <TableRow
                    key={fabric.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      logger.info(
                        "Row clicked - Navigating to fabric:",
                        fabric.id
                      );
                      router.push(`/inventory/${fabric.id}`);
                    }}
                  >
                    <TableCell className="font-medium">
                      <div>{fabric.name}</div>
                      {fabric.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {fabric.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{fabric.code}</TableCell>
                    <TableCell>{fabric.category}</TableCell>
                    <TableCell className="text-right">
                      {calculateTotalQuantity(fabric).toFixed(2)}{" "}
                      {fabric.unit || "pieces"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from firing
                            logger.info(
                              "View button clicked - Navigating to fabric:",
                              fabric.id
                            );
                            router.push(`/inventory/${fabric.id}`);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from firing
                            logger.info("Edit button clicked");
                            handleEditClick(fabric);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from firing
                            logger.info("Delete button clicked");
                            handleDeleteClick(fabric.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {!filteredFabrics.length && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No fabrics found.{" "}
                      {searchTerm && "Try adjusting your search terms."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Fabric Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFabric ? "Edit Fabric" : "Add New Fabric"}
              </DialogTitle>
            </DialogHeader>
            <FabricForm
              fabric={editingFabric}
              onSave={handleSaveFabric}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingFabric(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </InventoryErrorBoundary>
  );
}

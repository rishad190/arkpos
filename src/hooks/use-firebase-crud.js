"use client";
import { useCallback } from "react";
import {
  ref,
  push,
  set,
  remove,
  update,
  serverTimestamp,
} from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

/**
 * Custom hook for Firebase CRUD operations
 *
 * @param {string} collectionPath - Firebase collection path
 * @param {Object} options - Additional options
 * @returns {Object} CRUD operations
 */
export function useFirebaseCrud(collectionPath, options = {}) {
  const { toast } = useToast();
  const {
    successMessages = {
      create: "Item created successfully",
      update: "Item updated successfully",
      delete: "Item deleted successfully",
    },
    errorMessages = {
      create: "Failed to create item",
      update: "Failed to update item",
      delete: "Failed to delete item",
    },
    showToasts = true,
  } = options;

  // Create operation
  const create = useCallback(
    async (data) => {
      try {
        const collectionRef = ref(db, collectionPath);
        const newItemRef = push(collectionRef);

        await set(newItemRef, {
          ...data,
          createdAt: new Date().toISOString(),
        });

        if (showToasts) {
          toast({
            title: "Success",
            description: successMessages.create,
          });
        }

        return newItemRef.key;
      } catch (error) {
        console.error(`Error creating item in ${collectionPath}:`, error);

        if (showToasts) {
          toast({
            title: "Error",
            description: errorMessages.create,
            variant: "destructive",
          });
        }

        throw error;
      }
    },
    [
      collectionPath,
      errorMessages.create,
      showToasts,
      successMessages.create,
      toast,
    ]
  );

  // Read operation is handled by data-context directly

  // Update operation
  const update = useCallback(
    async (id, data) => {
      try {
        const itemRef = ref(db, `${collectionPath}/${id}`);

        await update(itemRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });

        if (showToasts) {
          toast({
            title: "Success",
            description: successMessages.update,
          });
        }

        return true;
      } catch (error) {
        console.error(`Error updating item in ${collectionPath}:`, error);

        if (showToasts) {
          toast({
            title: "Error",
            description: errorMessages.update,
            variant: "destructive",
          });
        }

        throw error;
      }
    },
    [
      collectionPath,
      errorMessages.update,
      showToasts,
      successMessages.update,
      toast,
    ]
  );

  // Delete operation
  const deleteItem = useCallback(
    async (id) => {
      try {
        await remove(ref(db, `${collectionPath}/${id}`));

        if (showToasts) {
          toast({
            title: "Success",
            description: successMessages.delete,
          });
        }

        return true;
      } catch (error) {
        console.error(`Error deleting item from ${collectionPath}:`, error);

        if (showToasts) {
          toast({
            title: "Error",
            description: errorMessages.delete,
            variant: "destructive",
          });
        }

        throw error;
      }
    },
    [
      collectionPath,
      errorMessages.delete,
      showToasts,
      successMessages.delete,
      toast,
    ]
  );

  return {
    create,
    update,
    delete: deleteItem, // Renamed to avoid conflict with JS keyword
  };
}

"use client";
import { ref, push, set, update, remove, get } from "firebase/database";

const COLLECTION_PATH = "fabrics";
const LOW_STOCK_THRESHOLD = 10;

/**
 * Fabric Service - Handles all fabric and inventory-related Firebase operations
 */
export class FabricService {
  constructor(db, logger, atomicOperations) {
    this.db = db;
    this.logger = logger;
    this.atomicOperations = atomicOperations;
  }

  /**
   * Add a new fabric
   */
  async addFabric(fabricData) {
    const validationErrors = this.validateFabricData(fabricData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    return this.atomicOperations.execute("addFabric", async () => {
      const fabricsRef = ref(this.db, COLLECTION_PATH);
      const newFabricRef = push(fabricsRef);
      const fabricId = newFabricRef.key;

      // Create fabric with empty batches object
      await set(newFabricRef, {
        ...fabricData,
        batches: {},
        createdAt: new Date().toISOString(),
      });
      return fabricId;
    });
  }

  /**
   * Update an existing fabric
   */
  async updateFabric(fabricId, updatedData) {
    const validationErrors = this.validateFabricData(updatedData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    return this.atomicOperations.execute("updateFabric", async () => {
      const fabricRef = ref(this.db, `${COLLECTION_PATH}/${fabricId}`);
      await update(fabricRef, {
        ...updatedData,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  /**
   * Delete a fabric
   */
  async deleteFabric(fabricId) {
    return this.atomicOperations.execute("deleteFabric", async () => {
      await remove(ref(this.db, `${COLLECTION_PATH}/${fabricId}`));
    });
  }

  /**
   * Add a new fabric batch
   */
  async addFabricBatch(batchData) {
    const validationErrors = this.validateBatchData(batchData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    const { fabricId, ...batchDetails } = batchData;

    return this.atomicOperations.execute("addFabricBatch", async () => {
      const fabricRef = ref(this.db, `${COLLECTION_PATH}/${fabricId}`);
      const fabricSnapshot = await get(fabricRef);

      if (!fabricSnapshot.exists()) {
        throw new Error(`Fabric with ID ${fabricId} not found`);
      }

      const fabricData = fabricSnapshot.val();
      const batchId = `batch_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Add batch to fabric's batches object
      const updatedBatches = {
        ...(fabricData.batches || {}),
        [batchId]: {
          ...batchDetails,
          createdAt: new Date().toISOString(),
        },
      };

      await update(fabricRef, {
        batches: updatedBatches,
        updatedAt: new Date().toISOString(),
      });

      return batchId;
    });
  }

  /**
   * Update an existing fabric batch
   */
  async updateFabricBatch(fabricId, batchId, updatedData) {
    const validationErrors = this.validateBatchData(updatedData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    return this.atomicOperations.execute("updateFabricBatch", async () => {
      const fabricRef = ref(this.db, `${COLLECTION_PATH}/${fabricId}`);
      const fabricSnapshot = await get(fabricRef);

      if (!fabricSnapshot.exists()) {
        throw new Error(`Fabric with ID ${fabricId} not found`);
      }

      const fabricData = fabricSnapshot.val();
      if (!fabricData.batches || !fabricData.batches[batchId]) {
        throw new Error(
          `Batch with ID ${batchId} not found in fabric ${fabricId}`
        );
      }

      // Update the specific batch
      const updatedBatches = {
        ...fabricData.batches,
        [batchId]: {
          ...fabricData.batches[batchId],
          ...updatedData,
          updatedAt: new Date().toISOString(),
        },
      };

      await update(fabricRef, {
        batches: updatedBatches,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  /**
   * Reduce inventory for sale products
   */
  async reduceInventory(saleProducts, acquireBatchLock, releaseBatchLock) {
    return this.atomicOperations.execute("reduceInventory", async () => {
      const updatePromises = [];
      const lockedBatches = new Set();

      try {
        for (const product of saleProducts) {
          // Validate product data
          if (!product.fabricId) {
            throw new Error(
              `Product "${product.name}" has no fabric ID. Please select a valid product.`
            );
          }

          if (!product.quantity || product.quantity <= 0) {
            throw new Error(`Invalid quantity for product "${product.name}"`);
          }

          const fabricRef = ref(this.db, `${COLLECTION_PATH}/${product.fabricId}`);
          const fabricSnapshot = await get(fabricRef);

          if (!fabricSnapshot.exists()) {
            throw new Error(
              `Fabric "${product.name}" (ID: ${product.fabricId}) not found in database`
            );
          }

          const fabricData = fabricSnapshot.val();
          if (
            !fabricData.batches ||
            Object.keys(fabricData.batches).length === 0
          ) {
            throw new Error(
              `No batches found for fabric "${product.name}". Please purchase stock for this fabric first.`
            );
          }

          let remainingQuantity = product.quantity;

          // Sort batches by purchase date (FIFO)
          const sortedBatches = Object.entries(fabricData.batches)
            .map(([batchId, batch]) => ({ batchId, ...batch }))
            .sort(
              (a, b) =>
                new Date(a.purchaseDate || a.createdAt) -
                new Date(b.purchaseDate || b.createdAt)
            );

          for (const batch of sortedBatches) {
            if (remainingQuantity <= 0) break;

            // Acquire lock for this batch
            const lockAcquired = await acquireBatchLock(batch.batchId);
            if (!lockAcquired) {
              throw new Error(
                `Could not acquire lock for batch ${batch.batchId}. Please try again.`
              );
            }
            lockedBatches.add(batch.batchId);

            if (!batch.items || !Array.isArray(batch.items)) {
              continue;
            }

            // Find items that match the color (if specified) or any item if no color
            const eligibleItems = batch.items.filter((item) => {
              if (product.color) {
                return (
                  item.colorName === product.color && (item.quantity || 0) > 0
                );
              }
              return (item.quantity || 0) > 0;
            });

            for (const item of eligibleItems) {
              if (remainingQuantity <= 0) break;

              const availableQuantity = item.quantity || 0;
              const quantityToReduce = Math.min(
                availableQuantity,
                remainingQuantity
              );

              if (quantityToReduce > 0) {
                // Update the item quantity
                item.quantity = availableQuantity - quantityToReduce;
                remainingQuantity -= quantityToReduce;
              }
            }

            // If we modified any items in this batch, add to update promises
            if (remainingQuantity < product.quantity) {
              updatePromises.push(
                this.updateFabricBatch(product.fabricId, batch.batchId, {
                  fabricId: product.fabricId,
                  items: batch.items,
                })
              );
            }
          }

          if (remainingQuantity > 0) {
            throw new Error(
              `Insufficient stock for ${product.name}. Only ${
                product.quantity - remainingQuantity
              } units available.`
            );
          }
        }

        // Wait for all batch updates to complete
        await Promise.all(updatePromises);
      } finally {
        // Release all acquired locks
        for (const batchId of lockedBatches) {
          await releaseBatchLock(batchId);
        }
      }
    });
  }

  /**
   * Validate fabric data
   */
  validateFabricData(fabricData) {
    const errors = [];
    if (!fabricData.name?.trim()) errors.push("Fabric name is required");
    if (!fabricData.category?.trim()) errors.push("Category is required");
    if (!fabricData.unit?.trim()) errors.push("Unit is required");
    return errors;
  }

  /**
   * Validate batch data
   */
  validateBatchData(batchData) {
    const errors = [];
    if (!batchData.fabricId) errors.push("Fabric ID is required");
    if (
      !batchData.items ||
      !Array.isArray(batchData.items) ||
      batchData.items.length === 0
    ) {
      errors.push("At least one item is required");
    }
    if (batchData.items) {
      batchData.items.forEach((item, index) => {
        if (!item.colorName?.trim())
          errors.push(`Item ${index + 1}: Color name is required`);
        if (!item.quantity || item.quantity <= 0)
          errors.push(`Item ${index + 1}: Valid quantity is required`);
      });
    }
    return errors;
  }

  /**
   * Calculate fabric inventory statistics
   */
  calculateInventoryStats(fabrics = []) {
    let totalStockValue = 0;
    let totalQuantity = 0;
    let lowStockItems = 0;

    fabrics.forEach((fabric) => {
      if (fabric.batches) {
        // Assuming fabric.batches is an object, not an array
        Object.values(fabric.batches).forEach((batch) => {
          if (batch.items && Array.isArray(batch.items)) {
            batch.items.forEach((item) => {
              totalQuantity += item.quantity || 0;
              // Assuming unit cost is available, otherwise skip value calculation
              if (batch.unitCost && item.quantity) {
                totalStockValue += batch.unitCost * item.quantity;
              }
              if ((item.quantity || 0) < LOW_STOCK_THRESHOLD) {
                // Low stock threshold
                lowStockItems++;
              }
            });
          }
        });
      }
    });

    return {
      totalStockValue,
      totalQuantity,
      lowStockItems,
      fabricCount: fabrics.length,
    };
  }
}

export default FabricService;

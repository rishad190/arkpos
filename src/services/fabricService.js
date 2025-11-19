"use client";
import { ref, push, set, update, remove, get } from "firebase/database";
import { AppError, ERROR_TYPES } from "@/lib/errors";
import {
  createValidResult,
  addError,
  validateRequired,
  validateStringLength,
  validatePositiveNumber,
  validateNonEmptyArray,
  formatValidationErrors,
} from "@/lib/validation";

const COLLECTION_PATH = "fabrics";
const LOW_STOCK_THRESHOLD = 10;

/**
 * Fabric Service - Handles all fabric and inventory-related Firebase operations
 * @typedef {import('../types/models').Fabric} Fabric
 * @typedef {import('../types/models').Batch} Batch
 * @typedef {import('../types/models').BatchData} BatchData
 * @typedef {import('../types/models').Product} Product
 * @typedef {import('../types/models').ValidationResult} ValidationResult
 * @typedef {import('../types/models').InventoryStats} InventoryStats
 */
export class FabricService {
  /**
   * Create a new FabricService instance
   * @param {import('firebase/database').Database} db - Firebase database instance
   * @param {Object} logger - Logger instance for logging operations
   * @param {import('./atomicOperations').AtomicOperationService} atomicOperations - Atomic operations service
   */
  constructor(db, logger, atomicOperations) {
    this.db = db;
    this.logger = logger;
    this.atomicOperations = atomicOperations;
  }

  /**
   * Add a new fabric to the database
   * @param {Partial<Fabric>} fabricData - Fabric data to add (name, category, unit)
   * @returns {Promise<string>} The new fabric ID
   * @throws {AppError} If validation fails or database operation fails
   */
  async addFabric(fabricData) {
    const validationResult = this.validateFabricData(fabricData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { fabricData, validationErrors: validationResult.errors }
      );
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
   * @param {string} fabricId - The fabric ID to update
   * @param {Partial<Fabric>} updatedData - Updated fabric data
   * @returns {Promise<void>}
   * @throws {AppError} If validation fails or database operation fails
   */
  async updateFabric(fabricId, updatedData) {
    const validationResult = this.validateFabricData(updatedData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { fabricId, updatedData, validationErrors: validationResult.errors }
      );
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
   * Delete a fabric from the database
   * @param {string} fabricId - The fabric ID to delete
   * @returns {Promise<void>}
   */
  async deleteFabric(fabricId) {
    return this.atomicOperations.execute("deleteFabric", async () => {
      await remove(ref(this.db, `${COLLECTION_PATH}/${fabricId}`));
    });
  }

  /**
   * Add a new batch to an existing fabric
   * @param {BatchData} batchData - Batch data including fabricId, items, purchaseDate, unitCost, supplier
   * @returns {Promise<string>} The new batch ID
   * @throws {AppError} If validation fails, fabric not found, or database operation fails
   */
  async addFabricBatch(batchData) {
    const validationResult = this.validateBatchData(batchData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { batchData, validationErrors: validationResult.errors }
      );
    }

    const { fabricId, ...batchDetails } = batchData;

    return this.atomicOperations.execute("addFabricBatch", async () => {
      const fabricRef = ref(this.db, `${COLLECTION_PATH}/${fabricId}`);
      const fabricSnapshot = await get(fabricRef);

      if (!fabricSnapshot.exists()) {
        throw new AppError(
          `Fabric with ID ${fabricId} not found`,
          ERROR_TYPES.NOT_FOUND,
          { fabricId }
        );
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
   * @param {string} fabricId - The fabric ID containing the batch
   * @param {string} batchId - The batch ID to update
   * @param {Partial<BatchData>} updatedData - Updated batch data
   * @returns {Promise<void>}
   * @throws {AppError} If validation fails, fabric/batch not found, or database operation fails
   */
  async updateFabricBatch(fabricId, batchId, updatedData) {
    const validationResult = this.validateBatchData(updatedData);
    if (!validationResult.isValid) {
      throw new AppError(
        `Validation failed: ${formatValidationErrors(validationResult)}`,
        ERROR_TYPES.VALIDATION,
        { fabricId, batchId, updatedData, validationErrors: validationResult.errors }
      );
    }

    return this.atomicOperations.execute("updateFabricBatch", async () => {
      const fabricRef = ref(this.db, `${COLLECTION_PATH}/${fabricId}`);
      const fabricSnapshot = await get(fabricRef);

      if (!fabricSnapshot.exists()) {
        throw new AppError(
          `Fabric with ID ${fabricId} not found`,
          ERROR_TYPES.NOT_FOUND,
          { fabricId }
        );
      }

      const fabricData = fabricSnapshot.val();
      if (!fabricData.batches || !fabricData.batches[batchId]) {
        throw new AppError(
          `Batch with ID ${batchId} not found in fabric ${fabricId}`,
          ERROR_TYPES.NOT_FOUND,
          { fabricId, batchId }
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
   * Reduce inventory for sale products using FIFO strategy
   * @param {Array<Product>} saleProducts - Array of products to reduce from inventory
   * @param {Function} acquireBatchLock - Function to acquire lock on a batch (batchId) => Promise<boolean>
   * @param {Function} releaseBatchLock - Function to release lock on a batch (batchId) => Promise<void>
   * @returns {Promise<void>}
   * @throws {AppError} If insufficient stock, invalid product data, or lock acquisition fails
   */
  async reduceInventory(saleProducts, acquireBatchLock, releaseBatchLock) {
    return this.atomicOperations.execute("reduceInventory", async () => {
      const updatePromises = [];
      const lockedBatches = new Set();

      try {
        // First pass: Validate all products and check stock availability
        const validationResults = [];
        
        for (const product of saleProducts) {
          // Validate product data
          if (!product.fabricId) {
            throw new AppError(
              `Product "${product.name}" has no fabric ID. Please select a valid product.`,
              ERROR_TYPES.VALIDATION,
              { product }
            );
          }

          if (!product.quantity || product.quantity <= 0) {
            throw new AppError(
              `Invalid quantity for product "${product.name}"`,
              ERROR_TYPES.VALIDATION,
              { product, quantity: product.quantity }
            );
          }

          const fabricRef = ref(this.db, `${COLLECTION_PATH}/${product.fabricId}`);
          const fabricSnapshot = await get(fabricRef);

          if (!fabricSnapshot.exists()) {
            throw new AppError(
              `Fabric "${product.name}" (ID: ${product.fabricId}) not found in database`,
              ERROR_TYPES.NOT_FOUND,
              { fabricId: product.fabricId, productName: product.name }
            );
          }

          const fabricData = fabricSnapshot.val();
          if (
            !fabricData.batches ||
            Object.keys(fabricData.batches).length === 0
          ) {
            throw new AppError(
              `No batches found for fabric "${product.name}". Please purchase stock for this fabric first.`,
              ERROR_TYPES.VALIDATION,
              { fabricId: product.fabricId, productName: product.name }
            );
          }

          // Calculate total available stock for this product
          let totalAvailable = 0;
          const sortedBatches = Object.entries(fabricData.batches)
            .map(([batchId, batch]) => ({ batchId, ...batch }))
            .sort(
              (a, b) =>
                new Date(a.purchaseDate || a.createdAt) -
                new Date(b.purchaseDate || b.createdAt)
            );

          for (const batch of sortedBatches) {
            if (!batch.items || !Array.isArray(batch.items)) {
              continue;
            }

            const eligibleItems = batch.items.filter((item) => {
              if (product.color) {
                return (
                  item.colorName === product.color && (item.quantity || 0) > 0
                );
              }
              return (item.quantity || 0) > 0;
            });

            for (const item of eligibleItems) {
              totalAvailable += item.quantity || 0;
            }
          }

          // Validate sufficient stock before proceeding
          if (totalAvailable < product.quantity) {
            throw new AppError(
              `Insufficient stock for ${product.name}. Requested: ${product.quantity}, Available: ${totalAvailable}`,
              ERROR_TYPES.VALIDATION,
              { 
                productName: product.name,
                requested: product.quantity,
                available: totalAvailable,
                fabricId: product.fabricId
              }
            );
          }

          validationResults.push({
            product,
            fabricData,
            sortedBatches,
            totalAvailable
          });
        }

        // Second pass: Perform actual inventory reduction
        for (const { product, fabricData, sortedBatches } of validationResults) {
          let remainingQuantity = product.quantity;

          for (const batch of sortedBatches) {
            if (remainingQuantity <= 0) break;

            // Acquire lock for this batch
            const lockAcquired = await acquireBatchLock(batch.batchId);
            if (!lockAcquired) {
              throw new AppError(
                `Could not acquire lock for batch ${batch.batchId}. Please try again.`,
                ERROR_TYPES.CONFLICT,
                { batchId: batch.batchId, productName: product.name }
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
                // Validate that reduction won't result in negative stock
                const newQuantity = availableQuantity - quantityToReduce;
                if (newQuantity < 0) {
                  throw new AppError(
                    `FIFO validation failed: Reduction would result in negative stock`,
                    ERROR_TYPES.VALIDATION,
                    {
                      productName: product.name,
                      batchId: batch.batchId,
                      itemColor: item.colorName,
                      availableQuantity,
                      quantityToReduce,
                      resultingQuantity: newQuantity
                    }
                  );
                }
                
                // Update the item quantity
                item.quantity = newQuantity;
                remainingQuantity -= quantityToReduce;
              }
            }

            // Add to update promises
            updatePromises.push(
              this.updateFabricBatch(product.fabricId, batch.batchId, {
                fabricId: product.fabricId,
                items: batch.items,
              })
            );
          }

          // Final validation: ensure all quantity was reduced
          if (remainingQuantity > 0) {
            throw new AppError(
              `FIFO reduction incomplete for ${product.name}. Remaining: ${remainingQuantity}`,
              ERROR_TYPES.VALIDATION,
              {
                productName: product.name,
                requestedQuantity: product.quantity,
                remainingQuantity
              }
            );
          }
        }

        // Wait for all batch updates to complete atomically
        await Promise.all(updatePromises);
        
        this.logger.info(
          `Successfully reduced inventory for ${saleProducts.length} products using FIFO strategy`
        );
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
   * @param {Object} fabricData - The fabric data to validate
   * @returns {ValidationResult} - Validation result with field-level errors
   */
  validateFabricData(fabricData) {
    const result = createValidResult();

    // Validate name
    const nameError = validateRequired(fabricData.name, 'name');
    if (nameError) {
      addError(result, nameError.field, nameError.message);
    } else {
      const lengthError = validateStringLength(fabricData.name, 'name', 1, 100);
      if (lengthError) {
        addError(result, lengthError.field, lengthError.message);
      }
    }

    // Validate category
    const categoryError = validateRequired(fabricData.category, 'category');
    if (categoryError) {
      addError(result, categoryError.field, categoryError.message);
    } else {
      const lengthError = validateStringLength(fabricData.category, 'category', 1, 50);
      if (lengthError) {
        addError(result, lengthError.field, lengthError.message);
      }
    }

    // Validate unit
    const unitError = validateRequired(fabricData.unit, 'unit');
    if (unitError) {
      addError(result, unitError.field, unitError.message);
    } else {
      const lengthError = validateStringLength(fabricData.unit, 'unit', 1, 20);
      if (lengthError) {
        addError(result, lengthError.field, lengthError.message);
      }
    }

    return result;
  }

  /**
   * Validate batch data
   * @param {Object} batchData - The batch data to validate
   * @returns {ValidationResult} - Validation result with field-level errors
   */
  validateBatchData(batchData) {
    const result = createValidResult();

    // Validate fabricId
    const fabricIdError = validateRequired(batchData.fabricId, 'fabricId');
    if (fabricIdError) {
      addError(result, fabricIdError.field, fabricIdError.message);
    }

    // Validate items array
    const itemsError = validateNonEmptyArray(batchData.items, 'items');
    if (itemsError) {
      addError(result, itemsError.field, itemsError.message);
    } else {
      // Validate each item in the array
      batchData.items.forEach((item, index) => {
        const itemPrefix = `items[${index}]`;

        // Validate color name
        const colorError = validateRequired(item.colorName, `${itemPrefix}.colorName`);
        if (colorError) {
          addError(result, colorError.field, colorError.message);
        }

        // Validate quantity
        if (item.quantity == null) {
          addError(result, `${itemPrefix}.quantity`, `${itemPrefix}.quantity is required`);
        } else {
          const quantityError = validatePositiveNumber(item.quantity, `${itemPrefix}.quantity`, true);
          if (quantityError) {
            addError(result, quantityError.field, quantityError.message);
          }
        }
      });
    }

    // Validate unitCost if provided
    if (batchData.unitCost != null) {
      const costError = validatePositiveNumber(batchData.unitCost, 'unitCost', true);
      if (costError) {
        addError(result, costError.field, costError.message);
      }
    }

    return result;
  }

  /**
   * Calculate fabric inventory statistics
   * @param {Array<Fabric>} [fabrics=[]] - Array of fabrics to calculate stats for
   * @returns {InventoryStats} Inventory statistics including total value, quantity, low stock items
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

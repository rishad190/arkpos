import { create } from "zustand";
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";
import { FabricService } from "@/services/fabricService";
import { useAppStore } from "@/store/appStore"; // Import app store

// Placeholder for batch locking mechanisms
const acquireBatchLock = async (batchId) => {
  logger.info(`[Lock] Acquiring lock for batch: ${batchId}`);
  return true;
};

const releaseBatchLock = async (batchId) => {
  logger.info(`[Lock] Releasing lock for batch: ${batchId}`);
};

// Helper function to lazily get the initialized service
const getAtomicService = () => {
  const service = useAppStore.getState().atomicOperations;
  if (!service) {
    logger.error(
      "AtomicOperationService not yet available in appStore",
      "inventoryStore"
    );
    return {
      execute: () => Promise.reject(new Error("Atomic service not ready.")),
    };
  }
  return service;
};

// Create a lazy wrapper for the service
const lazyAtomicOperations = {
  execute: (operationName, operationFn, fallbackFn = null) => {
    return getAtomicService().execute(operationName, operationFn, fallbackFn);
  },
};

// Instantiate FabricService using the lazy wrapper
const fabricService = new FabricService(db, logger, lazyAtomicOperations);

export const useInventoryStore = create((set) => ({
  fabrics: [],
  loading: true,
  error: null,

  setFabrics: (fabrics) => set({ fabrics, loading: false }),

  addFabric: async (fabricData) => {
    try {
      const newFabricId = await fabricService.addFabric(fabricData);
      // State updated by listener
      return newFabricId;
    } catch (error) {
      logger.error("Error adding fabric:", error);
      set({ error });
    }
  },

  updateFabric: async (fabricId, updatedData) => {
    try {
      await fabricService.updateFabric(fabricId, updatedData);
      // State updated by listener
    } catch (error) {
      logger.error("Error updating fabric:", error);
      set({ error });
    }
  },

  deleteFabric: async (fabricId) => {
    try {
      await fabricService.deleteFabric(fabricId);
      // State updated by listener
    } catch (error) {
      logger.error("Error deleting fabric:", error);
      set({ error });
    }
  },

  addFabricBatch: async (fabricId, batchData) => {
    try {
      const newBatchId = await fabricService.addFabricBatch(
        fabricId,
        batchData
      );
      // State updated by listener
      return newBatchId;
    } catch (error) {
      logger.error("Error adding fabric batch:", error);
      set({ error });
    }
  },

  updateFabricBatch: async (fabricId, batchId, updatedData) => {
    try {
      await fabricService.updateFabricBatch(fabricId, batchId, updatedData);
      // State updated by listener
    } catch (error) {
      logger.error("Error updating fabric batch:", error);
      set({ error });
    }
  },

  reduceInventory: async (saleProducts) => {
    try {
      await fabricService.reduceInventory(
        saleProducts,
        acquireBatchLock,
        releaseBatchLock
      );
      // State updated by listener
    } catch (error) {
      logger.error("Error reducing inventory:", error);
      set({ error });
    }
  },
}));

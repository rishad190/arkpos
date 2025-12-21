"use client";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { ref } from "firebase/database";
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";
// import { useFirebaseCrud } from "@/hooks/use-firebase-crud"; // Removed
import { useToast } from "@/hooks/use-toast";
import { useAtomicOperations } from "@/hooks/use-atomic-operations";
import { FabricService } from "@/services/fabricService";
import { SupplierService } from "@/services/supplierService";
import { AtomicOperationService } from "@/services/atomicOperations";
import { PartnerProductService } from "@/services/partnerProductService";

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const [fabrics, setFabrics] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [partnerProducts, setPartnerProducts] = useState([]);
  const [supplierTransactions, setSupplierTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { toast } = useToast();
  
  // Services
  const { service: atomicOperations, state: atomicState } = useAtomicOperations();
  const fabricService = useMemo(() => new FabricService(db, logger, atomicOperations), [atomicOperations]);
  const supplierService = useMemo(() => new SupplierService(db, logger, atomicOperations), [atomicOperations]);
  const partnerProductService = useMemo(() => new PartnerProductService(db, logger, atomicOperations), [atomicOperations]);

  // Subscribe to Fabrics
  useEffect(() => {
    const unsubscribe = fabricService.subscribeToFabrics((data) => {
      setFabrics(data);
    });
    return () => unsubscribe();
  }, [fabricService]);

  // Subscribe to Suppliers
  useEffect(() => {
    const unsubscribe = supplierService.subscribeToSuppliers((data) => {
      setSuppliers(data);
    });
    return () => unsubscribe();
  }, [supplierService]);
  
  // Subscribe to Supplier Transactions
  useEffect(() => {
    const unsubscribe = supplierService.subscribeToSupplierTransactions((data) => {
      setSupplierTransactions(data);
    });
    return () => unsubscribe();
  }, [supplierService]);

  // Subscribe to Partner Products
  useEffect(() => {
    const unsubscribe = partnerProductService.subscribeToPartnerProducts((data) => {
      setPartnerProducts(data);
    });
    return () => unsubscribe();
  }, [partnerProductService]);
// ... (omitted lines)
  const value = {
    fabrics,
    suppliers,
    supplierTransactions,
    partnerProducts,
    loading,
    error,
    // Atomic State
    offlineQueue: atomicState.offlineQueue,
    pendingOperations: atomicState.pendingOperations,
    // Fabric
    addFabric,
// ... (omitted lines)
    updateFabric,
    deleteFabric,
    adjustFabricStock,
    addFabricBatch: (data) => fabricService.addFabricBatch(data),
    updateFabricBatch: (fabricId, batchId, data) => fabricService.updateFabricBatch(fabricId, batchId, data),
    reduceInventory: (products) => fabricService.reduceInventory(products, atomicOperations.acquireLock, atomicOperations.releaseLock),
    // Supplier
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addSupplierTransaction: async (data) => supplierService.addSupplierTransaction(data),
    updateSupplierTransaction: async (id, data) => supplierService.updateSupplierTransaction(id, data),
    deleteSupplierTransaction: async (id, supplierId, amount, paidAmount) => supplierService.deleteSupplierTransaction(id, supplierId, amount, paidAmount),
    // Partner Product
    addPartnerProduct: (data) => partnerProductService.create(data),
    updatePartnerProduct: (id, data) => partnerProductService.update(id, data),
    deletePartnerProduct: (id) => partnerProductService.delete(id),
    // Partner Account operations
    addPartnerToProduct: (productId, partnerName) => partnerProductService.addPartnerToProduct(productId, partnerName),
    addTransactionToPartner: (productId, partnerName, data) => partnerProductService.addTransactionToPartner(productId, partnerName, data),
    updatePartnerName: (productId, oldName, newName) => partnerProductService.updatePartnerName(productId, oldName, newName),
    deletePartner: (productId, partnerName) => partnerProductService.deletePartner(productId, partnerName),
    updatePartnerTransaction: (productId, partnerName, transactionId, data) => partnerProductService.updatePartnerTransaction(productId, partnerName, transactionId, data),
    deletePartnerTransaction: (productId, partnerName, transactionId) => partnerProductService.deletePartnerTransaction(productId, partnerName, transactionId),
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}

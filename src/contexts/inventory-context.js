"use client";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { ref, onValue, query, orderByChild } from "firebase/database";
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";
import { useFirebaseCrud } from "@/hooks/use-firebase-crud";
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
    const fabricsRef = ref(db, "fabrics");
    const unsubFabrics = onValue(fabricsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const fabricList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        setFabrics(fabricList);
      } else {
        setFabrics([]);
      }
    }, (err) => {
      logger.error("Error fetching fabrics:", err);
      setError(err);
    });

    return () => unsubFabrics();
  }, []);

  // Subscribe to Suppliers
  useEffect(() => {
    const suppliersRef = ref(db, "suppliers");
    const unsubSuppliers = onValue(suppliersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const supplierList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        setSuppliers(supplierList);
      } else {
        setSuppliers([]);
      }
    }, (err) => {
      logger.error("Error fetching suppliers:", err);
      setError(err);
    });

    return () => unsubSuppliers();
  }, []);
  
  // Subscribe to Supplier Transactions
  useEffect(() => {
    const supplierTransactionsRef = ref(db, "supplierTransactions");
    const unsubSupplierTransactions = onValue(supplierTransactionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const txnList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        setSupplierTransactions(txnList);
      } else {
        setSupplierTransactions([]);
      }
    }, (err) => {
      logger.error("Error fetching supplier transactions:", err);
      // Don't set global error for this optimization, just log
    });
    
    return () => unsubSupplierTransactions();
  }, []);

  // Subscribe to Partner Products
  useEffect(() => {
    const partnerProductsRef = ref(db, "partnerProducts");
    const unsubPartnerProducts = onValue(partnerProductsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        setPartnerProducts(productList);
      } else {
        setPartnerProducts([]);
      }
    }, (err) => {
      logger.error("Error fetching partner products:", err);
      // Don't set global error for this optimization, just log
    });
    
    return () => unsubPartnerProducts();
  }, []);
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

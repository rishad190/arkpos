"use client";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
// import { ref, onValue, query, orderByChild } from "firebase/database"; // Removed
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";
// import { useFirebaseCrud } from "@/hooks/use-firebase-crud"; // Removed
import { useToast } from "@/hooks/use-toast";
import { useAtomicOperations } from "@/hooks/use-atomic-operations";
import { CustomerService } from "@/services/customerService";

const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { toast } = useToast();
  const { service: atomicOperations, state: atomicState } = useAtomicOperations();
  
  const customerService = useMemo(() => 
    new CustomerService(db, logger, atomicOperations), 
    [atomicOperations]
  );
  
  // Subscribe to Customers
  useEffect(() => {
    const unsubscribe = customerService.subscribeToCustomers((data) => {
      setCustomers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [customerService]);

  // CRUD Operations
  const addCustomer = useCallback(async (data) => {
    try {
      return await customerService.addCustomer(data);
    } catch (err) {
      logger.error("Context addCustomer error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [customerService, toast]);

  const updateCustomer = useCallback(async (id, data) => {
    try {
      await customerService.updateCustomer(id, data);
    } catch (err) {
      logger.error("Context updateCustomer error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [customerService, toast]);

  const deleteCustomer = useCallback(async (id, transactions = []) => {
    try {
      await customerService.deleteCustomer(id, transactions);
    } catch (err) {
      logger.error("Context deleteCustomer error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [customerService, toast]);

  const getCustomer = useCallback(async (id) => {
    return await customerService.getCustomer(id);
  }, [customerService]);

  const value = {
    customers,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomer,
    // Expose atomic state
    offlineQueue: atomicState.offlineQueue,
    pendingOperations: atomicState.pendingOperations,
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers() {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error("useCustomers must be used within a CustomerProvider");
  }
  return context;
}

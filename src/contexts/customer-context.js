"use client";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { ref, onValue, query, orderByChild } from "firebase/database";
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";
import { useFirebaseCrud } from "@/hooks/use-firebase-crud";
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
  
  const crud = useFirebaseCrud("customers");
// ... (omitted lines)
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

"use client";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";
import { useToast } from "@/hooks/use-toast";
import { useAtomicOperations } from "@/hooks/use-atomic-operations";
import { TransactionService } from "@/services/transactionService";
import { AtomicOperationService } from "@/services/atomicOperations";
import { CashTransactionService } from "@/services/cashTransactionService";

const TransactionContext = createContext(null);

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [dailyCashIncome, setDailyCashIncome] = useState([]);
  const [dailyCashExpense, setDailyCashExpense] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { toast } = useToast();
  
  const { service: atomicOperations, state: atomicState } = useAtomicOperations();
  const transactionService = useMemo(() => new TransactionService(db, logger, atomicOperations), [atomicOperations]);
  const cashTransactionService = useMemo(() => new CashTransactionService(db, logger, atomicOperations), [atomicOperations]);

  // Subscribe to Transactions
  useEffect(() => {
    // Optimization: Only fetch the last 100 transactions by default
    const unsubscribe = transactionService.subscribeToTransactions((data) => {
      setTransactions(data);
      setLoading(false);
    }, { limit: 100 });
    return () => unsubscribe();
  }, [transactionService]);

  // Subscribe to Daily Cash Income
  useEffect(() => {
    const unsubscribe = cashTransactionService.subscribeToDailyCashIncome((data) => {
      setDailyCashIncome(data);
    });
    return () => unsubscribe();
  }, [cashTransactionService]);

  // Subscribe to Daily Cash Expense
  useEffect(() => {
    const unsubscribe = cashTransactionService.subscribeToDailyCashExpense((data) => {
      setDailyCashExpense(data);
    });
    return () => unsubscribe();
  }, [cashTransactionService]);

  // Connection State
  const [connectionState, setConnectionState] = useState("connecting");
  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    const unsub = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        setConnectionState("connected");
      } else {
        setConnectionState("disconnected");
      }
    });
    return () => unsub();
  }, []);

  // Computed Properties
  const dailyCashTransactions = useMemo(() => {
    const combined = [...dailyCashIncome, ...dailyCashExpense];
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));
    return combined;
  }, [dailyCashIncome, dailyCashExpense]);


  // Operation Wrappers
  const addTransaction = useCallback(async (data) => {
    try {
      return await transactionService.addTransaction(data);
    } catch (err) {
      logger.error("Context addTransaction error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [transactionService, toast]);

  const updateTransaction = useCallback(async (id, data) => {
    try {
      await transactionService.updateTransaction(id, data);
    } catch (err) {
      logger.error("Context updateTransaction error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [transactionService, toast]);

  const deleteTransaction = useCallback(async (id) => {
    try {
      await transactionService.deleteTransaction(id);
    } catch (err) {
      logger.error("Context deleteTransaction error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [transactionService, toast]);

  // Cash Operation Wrappers
  const addDailyCashTransaction = useCallback(async (data) => {
    return await cashTransactionService.addCashTransaction(data);
  }, [cashTransactionService]);

  const updateDailyCashTransaction = useCallback(async (id, data) => {
    return await cashTransactionService.updateCashTransaction(id, data);
  }, [cashTransactionService]);

  const deleteDailyCashTransaction = useCallback(async (id) => {
    return await cashTransactionService.deleteCashTransaction(id);
  }, [cashTransactionService]);

  const addPaymentToMemo = useCallback(async (memoNumber, paymentData, customerId) => {
    try {
      return await transactionService.addPaymentToMemo(memoNumber, paymentData, customerId);
    } catch (err) {
      logger.error("Context addPaymentToMemo error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [transactionService, toast]);

  // Read Wrappers (Memoized for performance)
  const getCustomerTransactionsByMemo = useCallback((customerId) => {
    return transactionService.getCustomerTransactionsByMemo(customerId, transactions);
  }, [transactionService, transactions]);

  const getMemoDetails = useCallback((memoNumber) => {
    return transactionService.getMemoDetails(memoNumber, transactions);
  }, [transactionService, transactions]);

  const calculateCustomerTotalDue = useCallback((customerId) => {
    return transactionService.calculateCustomerTotalDue(customerId, transactions);
  }, [transactionService, transactions]);

  const getCustomerMemosWithDues = useCallback((customerId) => {
    return transactionService.getCustomerMemosWithDues(customerId, transactions);
  }, [transactionService, transactions]);

  const value = {
    transactions,
    dailyCashIncome,
    dailyCashExpense,
    dailyCashTransactions,
    connectionState,
    loading,
    error,
    // Atomic State
    offlineQueue: atomicState.offlineQueue,
    pendingOperations: atomicState.pendingOperations,
    
    // CRUD
    addTransaction,
    updateTransaction,
    deleteTransaction,
    // Cash CRUD
    addDailyCashTransaction,
    updateDailyCashTransaction,
    deleteDailyCashTransaction,
    // Memo operations
    getCustomerTransactionsByMemo,
    getMemoDetails,
    addPaymentToMemo,
    calculateCustomerTotalDue,
    getCustomerMemosWithDues,
    subscribeToCustomerTransactions: transactionService.subscribeToCustomerTransactions.bind(transactionService),
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error("useTransactions must be used within a TransactionProvider");
  }
  return context;
}

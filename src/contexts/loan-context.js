"use client";
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import logger from "@/utils/logger";
import { useToast } from "@/hooks/use-toast";
import { LoanService } from "@/services/loanService";

const LoanContext = createContext(null);

export function LoanProvider({ children }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loanService = useMemo(() => new LoanService(db, logger), []);

  useEffect(() => {
    const unsubscribe = loanService.subscribeToLoans((data) => {
      setLoans(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loanService]);

  const addLoan = useCallback(async (data) => {
    try {
      return await loanService.addLoan(data);
    } catch (err) {
      logger.error("Context addLoan error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [loanService, toast]);

  const updateLoan = useCallback(async (id, data) => {
    try {
      await loanService.updateLoan(id, data);
      toast({ title: "Success", description: "Loan updated successfully" });
    } catch (err) {
      logger.error("Context updateLoan error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [loanService, toast]);

  const deleteLoan = useCallback(async (id) => {
    try {
      await loanService.deleteLoan(id);
      toast({ title: "Success", description: "Loan deleted successfully" });
    } catch (err) {
      logger.error("Context deleteLoan error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [loanService, toast]);

  const totals = useMemo(() => {
    return loans.reduce((acc, loan) => {
      // The manual ledger gives us totalTaken, totalRepaid, totalProfit, balance
      // totalTaken = sum of all principals taken/given
      
      if (loan.type === 'GIVEN') {
        acc.givenTotal += loan.totalTaken || 0;
        acc.givenRepaid += loan.totalRepaid || 0;
        acc.givenProfit += loan.totalProfit || 0;
        acc.givenBalance += loan.balance || 0;
      } else { // TAKEN
        acc.takenTotal += loan.totalTaken || 0;
        acc.takenRepaid += loan.totalRepaid || 0;
        acc.takenProfit += loan.totalProfit || 0;
        acc.takenBalance += loan.balance || 0;
      }
      return acc;
    }, {
      givenTotal: 0,
      givenRepaid: 0,
      givenProfit: 0,
      givenBalance: 0,
      takenTotal: 0,
      takenRepaid: 0,
      takenProfit: 0,
      takenBalance: 0
    });
  }, [loans]);

  const addLoanTransaction = useCallback(async (loanId, data) => {
    try {
      await loanService.addLoanTransaction(loanId, data);
      toast({ title: "Success", description: "Transaction logged successfully" });
    } catch (err) {
      logger.error("Context addLoanTransaction error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  }, [loanService, toast]);

  const value = {
    loans,
    totals,
    loading,
    addLoan,
    updateLoan,
    deleteLoan,
    addLoanTransaction
  };

  return (
    <LoanContext.Provider value={value}>
      {children}
    </LoanContext.Provider>
  );
}

export function useLoans() {
  const context = useContext(LoanContext);
  if (!context) {
    throw new Error("useLoans must be used within a LoanProvider");
  }
  return context;
}

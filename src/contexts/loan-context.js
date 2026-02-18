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
      const amount = loan.principal || 0; // Use Principal for base, or totalDue for current value?
      // Usually "Assets" = Principal + Interest Receivable
      // "Liabilities" = Principal + Interest Payable
      const currentValue = loan.totalDue || amount;

      if (loan.type === 'GIVEN') {
        acc.givenPrincipal += amount;
        acc.givenTotal += currentValue;
        acc.givenInterest += (loan.calculatedInterest || 0);
      } else { // TAKEN
        acc.takenPrincipal += amount;
        acc.takenTotal += currentValue;
        acc.takenInterest += (loan.calculatedInterest || 0);
      }
      return acc;
    }, {
      givenPrincipal: 0,
      givenInterest: 0,
      givenTotal: 0,
      takenPrincipal: 0,
      takenInterest: 0,
      takenTotal: 0
    });
  }, [loans]);

  const value = {
    loans,
    totals,
    loading,
    addLoan,
    updateLoan,
    deleteLoan
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

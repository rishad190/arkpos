"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { CustomerProvider } from "@/contexts/customer-context";
import { InventoryProvider } from "@/contexts/inventory-context";
import { TransactionProvider } from "@/contexts/transaction-context";
import { LoanProvider } from "@/contexts/loan-context";

export function ClientProvider({ children }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CustomerProvider>
          <InventoryProvider>
            <TransactionProvider>
              <LoanProvider>
                {children}
              </LoanProvider>
            </TransactionProvider>
          </InventoryProvider>
        </CustomerProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

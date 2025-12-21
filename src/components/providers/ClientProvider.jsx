"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { CustomerProvider } from "@/contexts/customer-context";
import { InventoryProvider } from "@/contexts/inventory-context";
import { TransactionProvider } from "@/contexts/transaction-context";

export function ClientProvider({ children }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CustomerProvider>
          <InventoryProvider>
            <TransactionProvider>
            {children}
            </TransactionProvider>
          </InventoryProvider>
        </CustomerProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

"use client";
import { AuthProvider } from "@/contexts/auth-context";
import { DataProvider } from "@/contexts/data-context";
import { Toaster } from "@/components/ui/toaster";

export function ClientLayout({ children }) {
  return (
    <AuthProvider>
      <DataProvider>
        {children}
        <Toaster />
      </DataProvider>
    </AuthProvider>
  );
}

"use client";
import { ClientProvider } from "@/components/providers/ClientProvider";
import { Toaster } from "@/components/ui/toaster";

export function ClientLayout({ children }) {
  return (
    <ClientProvider>
      {children}
      <Toaster />
    </ClientProvider>
  );
}

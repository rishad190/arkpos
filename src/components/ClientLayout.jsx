"use client";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseDataSync } from "./FirebaseDataSync";

export function ClientLayout({ children }) {
  return (
    <AuthProvider>
      <FirebaseDataSync />
      {children}
      <Toaster />
    </AuthProvider>
  );
}

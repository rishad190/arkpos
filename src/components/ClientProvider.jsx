"use client";
import { DataProvider } from "@/contexts/data-context";

export function ClientProvider({ children }) {
  return <DataProvider>{children}</DataProvider>;
}

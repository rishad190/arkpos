"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useSettings } from "@/contexts/settings-context";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

function getRequiredPermissionKey(pathname) {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/cashbook")) return "cashbook";
  if (pathname.startsWith("/inventory-profit")) return "inventoryProfit";
  if (pathname.startsWith("/cashmemo")) return "cashmemo";
  if (pathname.startsWith("/suppliers")) return "suppliers";
  if (pathname.startsWith("/partners")) return "partners";
  if (pathname.startsWith("/loans")) return "loans";
  if (pathname.startsWith("/products")) return "products";
  if (pathname.startsWith("/reports/expense")) return "expenseReport";
  if (pathname.startsWith("/settings")) return "settings";
  return null;
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (pathname !== "/login") {
        router.push("/login");
      }
      return;
    }

    // Role-based route protection
    if (user.role !== "admin") {
      const permissionKey = getRequiredPermissionKey(pathname);
      if (permissionKey && settings?.permissions?.[permissionKey] === false) {
        // Access Denied! Show toast
        toast({
          title: "Access Denied",
          description: "You do not have permission to access this page.",
          variant: "destructive",
        });

        // Find first permitted page to redirect to
        const orderOfPreference = [
          { key: "dashboard", path: "/" },
          { key: "cashmemo", path: "/cashmemo" },
          { key: "customers", path: "/customers" },
          { key: "inventory", path: "/inventory" },
        ];

        let targetPath = null;
        for (const item of orderOfPreference) {
          if (settings?.permissions?.[item.key] !== false) {
            targetPath = item.path;
            break;
          }
        }

        // If no preferred path is permitted, check other pages
        if (!targetPath) {
          const keys = Object.keys(settings?.permissions || {});
          const firstAllowedKey = keys.find(k => settings?.permissions?.[k] !== false);
          if (firstAllowedKey) {
            if (firstAllowedKey === "expenseReport") targetPath = "/reports/expense";
            else if (firstAllowedKey === "inventoryProfit") targetPath = "/inventory-profit";
            else targetPath = `/${firstAllowedKey}`;
          }
        }

        // Default fallback
        if (!targetPath) {
          targetPath = "/";
        }

        router.push(targetPath);
      }
    }
  }, [user, loading, settings, pathname, router, toast]);

  const isAllowed = (() => {
    if (loading) return false;
    if (!user) return pathname === "/login";
    if (user.role === "admin") return true;

    const permissionKey = getRequiredPermissionKey(pathname);
    if (permissionKey && settings?.permissions?.[permissionKey] === false) {
      return false;
    }
    return true;
  })();

  if (loading || !isAllowed) {
    return <LoadingSpinner />;
  }

  return children;
}

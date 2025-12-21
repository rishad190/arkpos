"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Redirect to login if not authenticated and not already on login page
    if (!loading && !user && pathname !== "/login") {
      console.warn("[AUTH] Redirecting to login - user not authenticated");
      router.push("/login");
    }

    // Redirect to dashboard if authenticated and on login page
    if (!loading && user && pathname === "/login") {
      console.warn(
        "[AUTH] Redirecting to dashboard - user already authenticated"
      );
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }

  // Allow access if authenticated or on login page
  if (user || pathname === "/login") {
    return <>{children}</>;
  }

  // Show nothing while redirecting
  return null;
}

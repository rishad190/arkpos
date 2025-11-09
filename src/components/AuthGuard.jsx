"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const auth = localStorage.getItem("isAuthenticated");
      setIsAuthenticated(auth === "true");
      setIsLoading(false);

      if (!auth && pathname !== "/login") {
        router.push("/login");
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}

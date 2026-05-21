"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { initializeSessionManager } from "@/lib/sessionManager";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) {
      try {
        const storedUser = localStorage.getItem("arkpos_mock_user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
          if (pathname !== "/login") {
            router.push("/login");
          }
        }
      } catch (e) {
        console.error("Error reading mock user:", e);
      }
      setLoading(false);
      return;
    }

    // Initialize session manager
    initializeSessionManager({
      timeout: 30 * 60 * 1000, // 30 minutes
      onExpired: () => {
        router.push("/login");
      },
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (!user && pathname !== "/login") {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const login = (email, password) => {
    if (!auth) {
      const mockUser = {
        uid: "mock-user-123",
        email: email,
        displayName: "Demo User",
      };
      try {
        localStorage.setItem("arkpos_mock_user", JSON.stringify(mockUser));
      } catch (e) {
        console.error("Error saving mock user:", e);
      }
      setUser(mockUser);
      return Promise.resolve(mockUser);
    }
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    if (!auth) {
      try {
        localStorage.removeItem("arkpos_mock_user");
      } catch (e) {
        console.error("Error removing mock user:", e);
      }
      setUser(null);
      router.push("/login");
      return Promise.resolve();
    }
    return signOut(auth);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

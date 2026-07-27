"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";
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
          const parsedUser = JSON.parse(storedUser);
          if (!parsedUser.role) {
            const email = parsedUser.email || "";
            parsedUser.role = email.includes("admin") ? "admin" : "staff";
          }
          setUser(parsedUser);
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

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        try {
          let role = null;
          if (db) {
            const roleRef = ref(db, `users/${firebaseUser.uid}/role`);
            const snapshot = await get(roleRef);
            role = snapshot.val();
            
            if (!role) {
              // Initialize role
              const email = firebaseUser.email || "";
              role = email.includes("admin") ? "admin" : "staff";
              
              // Save to Firebase
              await set(ref(db, `users/${firebaseUser.uid}`), {
                email: email,
                role: role,
                displayName: firebaseUser.displayName || "",
                createdAt: new Date().toISOString(),
              });
            }
          } else {
            const email = firebaseUser.email || "";
            role = email.includes("admin") ? "admin" : "staff";
          }
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: role,
          });
        } catch (error) {
          console.error("Error fetching user role:", error);
          const email = firebaseUser.email || "";
          const fallbackRole = email.includes("admin") ? "admin" : "staff";
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: fallbackRole,
          });
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
        if (pathname !== "/login") {
          router.push("/login");
        }
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const login = (email, password) => {
    if (!auth) {
      const calculatedRole = email.includes("admin") ? "admin" : "staff";
      const mockUser = {
        uid: "mock-user-123",
        email: email,
        displayName: "Demo User",
        role: calculatedRole,
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

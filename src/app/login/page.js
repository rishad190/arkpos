"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = localStorage.getItem("isAuthenticated") === "true";
      if (isAuth) {
        router.push("/");
      } else {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (loginAttempts >= 5) {
        setError("Too many failed attempts. Please try again later.");
        return;
      }

      // In a real application, this should be a secure backend authentication call.
      // For this example, we are using an environment variable for the password.
      if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
        setIsLoading(true);
        // Using localStorage is not recommended for secure session management.
        // A more secure method like Firebase Authentication should be used.
        localStorage.setItem("isAuthenticated", "true");
        await router.push("/");
      } else {
        setLoginAttempts((prev) => prev + 1);
        setError(`Invalid password. ${5 - loginAttempts} attempts remaining.`);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred during login");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="space-y-4">
          <div className="flex justify-center">
            <Image
              src="/download.png"
              alt="ARK"
              width={80}
              height={80}
              className="rounded-lg shadow-sm"
              priority
            />
          </div>
          <h2 className="text-center text-3xl font-bold text-gray-900">ARK</h2>
          <p className="text-center text-sm text-gray-600">
            Welcome back! Please sign in to continue.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
            disabled={isLoading || loginAttempts >= 5}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Signing in...</span>
              </div>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} ARK. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

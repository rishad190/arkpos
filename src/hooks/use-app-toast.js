"use client";

import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

/**
 * A custom hook for displaying consistent toast notifications.
 *
 * @returns {object} An object with `toastSuccess`, `toastError`, and `toastWarning` functions.
 */
export function useAppToast() {
  const { toast } = useToast();

  const toastSuccess = (message) => {
    toast({
      description: (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span>{message}</span>
        </div>
      ),
    });
  };

  const toastError = (message) => {
    toast({
      variant: "destructive",
      description: (
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5" />
          <span>{message}</span>
        </div>
      ),
    });
  };

  const toastWarning = (message) => {
    toast({
      description: (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <span>{message}</span>
        </div>
      ),
    });
  };

  return { toastSuccess, toastError, toastWarning };
}
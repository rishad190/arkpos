"use client";
import { useTransactions } from "@/contexts/transaction-context";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Connection Indicator Component
 * Displays the current connection state and offline queue status
 * @returns {JSX.Element}
 */
export function ConnectionIndicator() {
  const { connectionState, offlineQueue, pendingOperations } = useTransactions();

  const isConnected = connectionState === "connected";
  const isDisconnected = connectionState === "disconnected";
  const hasOfflineQueue = offlineQueue && offlineQueue.length > 0;
  const hasPendingOps = pendingOperations && pendingOperations.size > 0;

  // Don't show indicator if connected and no pending operations
  if (isConnected && !hasOfflineQueue && !hasPendingOps) {
    return null;
  }

  const getStatusInfo = () => {
    if (isDisconnected) {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        label: "Offline",
        variant: "destructive",
        tooltip: hasOfflineQueue
          ? `${offlineQueue.length} operation(s) queued`
          : "No internet connection",
      };
    }

    if (hasPendingOps) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        label: "Syncing",
        variant: "secondary",
        tooltip: `${pendingOperations.size} operation(s) in progress`,
      };
    }

    if (hasOfflineQueue) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        label: "Processing",
        variant: "secondary",
        tooltip: `Processing ${offlineQueue.length} queued operation(s)`,
      };
    }

    return {
      icon: <Wifi className="h-4 w-4" />,
      label: "Online",
      variant: "default",
      tooltip: "Connected",
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={statusInfo.variant}
            className="flex items-center gap-2 cursor-help"
          >
            {statusInfo.icon}
            <span className="text-xs">{statusInfo.label}</span>
            {hasOfflineQueue && (
              <span className="text-xs font-bold">({offlineQueue.length})</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusInfo.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

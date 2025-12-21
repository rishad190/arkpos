"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

// Base Loading Components
export function LoadingSpinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`animate-spin text-primary ${sizeClasses[size]}`} />
    </div>
  );
}

export function LoadingState({
  title = "Loading...",
  description = "Please wait while we fetch the data",
  size = "md",
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 p-8 ${className}`}
    >
      <LoadingSpinner size={size} />
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// Skeleton Components
export function PageHeaderSkeleton({ className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}

export function CardSkeleton({ count = 1, className = "" }) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
    >
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-lg" />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 6,
  showHeader = true,
  className = "",
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {showHeader && <Skeleton className="h-10 w-full" />}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={`h-16 flex-1 ${colIndex === 0 ? "w-32" : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4, className = "" }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

// Specialized Loading Components
export function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeaderSkeleton />
      <CardSkeleton count={4} />
      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}

export function InventoryLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <Skeleton className="h-10 w-full" />

      <TableSkeleton rows={8} columns={7} />
    </div>
  );
}

export function CashMemoLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <PageHeaderSkeleton />

      {/* Customer & Memo Details Card */}
      <div className="space-y-4 p-6 border rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSkeleton fields={4} />
          <FormSkeleton fields={2} />
        </div>
      </div>

      {/* Product Entry Card */}
      <div className="space-y-4 p-6 border rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>

        <TableSkeleton rows={3} columns={6} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function CashbookLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <CardSkeleton count={4} />
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}

// Overlay Loading Components
export function OverlayLoading({
  message = "Processing...",
  showSpinner = true,
}) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg border flex items-center space-x-3">
        {showSpinner && <LoadingSpinner size="md" />}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

export function ButtonLoading({ text = "Loading...", size = "md" }) {
  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-11 px-8",
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 ${sizeClasses[size]}`}
    >
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}

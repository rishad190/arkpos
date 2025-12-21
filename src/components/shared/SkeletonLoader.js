"use client";

import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * A reusable skeleton loader for page content.
 *
 * @param {object} props - The component props.
 * @param {boolean} [props.hasSummaryCards=true] - Whether to show summary card skeletons.
 * @param {boolean} [props.hasDataTable=true] - Whether to show a data table skeleton.
 * @returns {React.ReactNode} The rendered skeleton loader.
 */
export function SkeletonLoader({ hasSummaryCards = true, hasDataTable = true }) {
  const SummaryCardSkeleton = () => (
    <Card className="overflow-hidden border-none shadow-md">
      <CardHeader className="p-4 border-b">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );

  const TableSkeleton = () => (
    <Card className="border-none shadow-md">
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Summary Cards */}
      {hasSummaryCards && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      )}

      {/* Table */}
      {hasDataTable && <TableSkeleton />}
    </div>
  );
}
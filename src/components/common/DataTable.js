"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * A reusable data table component with sorting, filtering, and column visibility controls.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.data - The array of data to display.
 * @param {Array<object>} props.columns - The configuration for the table columns.
 * @param {string} [props.filterColumn] - The column to use for the global search filter.
 * @param {number} [props.itemsPerPage=10] - The number of items to display per page.
 * @param {object} [props.emptyState] - Configuration for the empty state component.
 * @returns {React.ReactNode} The rendered data table.
 */
export function DataTable({ data, columns, filterColumn, itemsPerPage = 10, emptyState }) {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const table = {
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: () => ({ rows: data }), // Simplified for this example
    getSortedRowModel: () => ({ rows: data }), // Simplified
    getFilteredRowModel: () => ({ rows: data }), // Simplified
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  };

  const filteredData = useMemo(() => {
    let filtered = data;

    if (globalFilter && filterColumn) {
      filtered = filtered.filter(item =>
        item[filterColumn]?.toString().toLowerCase().includes(globalFilter.toLowerCase())
      );
    }

    // Add more complex filtering logic here if needed

    return filtered;
  }, [data, globalFilter, filterColumn]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  return (
    <div>
      <div className="flex items-center py-4">
        {filterColumn && (
          <Input
            placeholder={`Filter by ${filterColumn}...`}
            value={globalFilter}
            onChange={(event) => {
              setGlobalFilter(event.target.value);
              setCurrentPage(1); // Reset to first page on new filter
            }}
            className="max-w-sm"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {columns
              .filter((column) => column.header)
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.accessorKey}
                    className="capitalize"
                    checked={!columnVisibility[column.accessorKey]}
                    onCheckedChange={(value) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        [column.accessorKey]: !value,
                      }))
                    }
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.accessorKey}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length ? (
              paginatedData.map((row, rowIndex) => (
                <TableRow key={row.id || rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={column.accessorKey}>
                      {column.cell ? column.cell({ row }) : row[column.accessorKey]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <EmptyState
                    title={emptyState?.title || "No results found"}
                    description={emptyState?.description}
                    icon={emptyState?.icon}
                    action={emptyState?.action}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalItems={filteredData.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        className="mt-4"
      />
    </div>
  );
}
"use client";

import React, { useState, useMemo } from "react";
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
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";

/**
 * A reusable data table component with sorting, filtering, and column visibility controls.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.data - The array of data to display.
 * @param {Array<object>} props.columns - The configuration for the table columns.
 * @param {string} [props.filterColumn] - The column to use for the global search filter.
 * @param {number} [props.itemsPerPage=10] - The number of items to display per page.
 * @param {object} [props.emptyState] - Configuration for the empty state component.
 * @param {function} [props.onRowClick] - Function to handle row clicks.
 * @returns {React.ReactNode} The rendered data table.
 */
export function DataTable({
  data,
  columns,
  filterColumn,
  itemsPerPage = 10,
  emptyState,
  onRowClick,
}) {
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
      filtered = filtered.filter((item) =>
        item[filterColumn]
          ?.toString()
          .toLowerCase()
          .includes(globalFilter.toLowerCase())
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
                const columnKey = column.accessorKey || column.id;
                return (
                  <DropdownMenuCheckboxItem
                    key={columnKey}
                    className="capitalize"
                    checked={!columnVisibility[columnKey]}
                    onCheckedChange={(value) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        [columnKey]: !value,
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
                <TableHead key={column.accessorKey || column.id}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length ? (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={row.id || rowIndex}
                  onClick={(event) => {
                    if (!onRowClick) return;
                    // If the click originated outside this row (for example,
                    // from a modal rendered in a portal), ignore it — it shouldn't
                    // trigger a row navigation.
                    if (!event.currentTarget.contains(event.target)) return;

                    // If the click originated from inside an element that should
                    // ignore row clicks (e.g., action buttons/menus), do nothing.
                    let el = event.target;
                    while (el && el !== event.currentTarget) {
                      if (
                        el.getAttribute &&
                        el.getAttribute("data-row-click-ignore") !== null
                      ) {
                        return;
                      }
                      el = el.parentElement;
                    }

                    onRowClick(row);
                  }}
                  className={onRowClick ? "cursor-pointer" : ""}
                >
                  {columns.map((column) => (
                    <TableCell key={column.accessorKey || column.id}>
                      {column.cell
                        ? // Pass the row data in the structure expected by the cell renderers (`row.original`)
                          column.cell({ row: { original: row } })
                        : row[column.accessorKey]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
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

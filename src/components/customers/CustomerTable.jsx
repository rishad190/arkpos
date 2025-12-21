"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function CustomerTable({
  customers,
  getCustomerDue,
  getCustomerMemoCount,
  onRowClick,
  onEdit,
  onDelete,
}) {
  const columns = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "address",
      header: "Address",
      // Truncate long addresses for better layout
      cell: ({ row }) => (
        <div className="truncate max-w-[200px]">{row.original?.address}</div>
      ),
    },
    {
      accessorKey: "storeId",
      header: "Store ID",
    },
    {
      accessorKey: "memoCount",
      header: "Memos",
      cell: ({ row }) => {
        if (!row.original) return null;
        const memoCount = getCustomerMemoCount ? getCustomerMemoCount(row.original.id) : 0;
        return (
          <div className="text-center">
            {memoCount}
          </div>
        );
      },
    },
    {
      accessorKey: "due",
      header: "Due Amount",
      cell: ({ row }) => {
        // Ensure row data exists before processing
        if (!row.original) return null;
        // Assumes getCustomerDue is a function that returns the due amount for a customer
        const dueAmount = getCustomerDue(row.original.id);
        return (
          // Apply conditional styling for high due amounts
          <div
            className={`text-right font-medium ${
              dueAmount > 1000 ? "text-red-500" : ""
            }`}
          >
            ৳{dueAmount.toLocaleString()}
          </div>
        );
      },
    },
    {
      id: "actions",
      // This cell provides action buttons (Edit, Delete) for each row
      cell: ({ row }) => {
        if (!row.original) return null;

        return (
          // Prevent clicks inside the actions cell from bubbling to the table row
          // and mark this cell so the DataTable can reliably ignore clicks here
          <div
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
            data-row-click-ignore
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                  data-radix-dropdown-menu-trigger
                >
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(e) => {
                    // Prevent the table row click from firing (which navigates away)
                    e?.stopPropagation?.();
                    // Menu will close automatically; open dialog on next frame
                    requestAnimationFrame(() => {
                      if (onEdit) onEdit(row.original);
                    });
                  }}
                >
                  Edit
                </DropdownMenuItem>
                {/* Controlled delete dialog: set deleteTarget to open the dialog */}
                <DropdownMenuItem
                  className="text-red-500"
                  onSelect={(e) => {
                    e?.stopPropagation?.();
                    // Allow the menu to close first, then open the dialog
                    requestAnimationFrame(() => setDeleteTarget(row.original));
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Controlled AlertDialog state for delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  if (!customers || !Array.isArray(customers)) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <DataTable
        data={customers}
        columns={columns}
        filterColumn="name"
        onRowClick={(row) => onRowClick(row.id)}
      />

      {/* Delete confirmation dialog (controlled) */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              customer and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete && deleteTarget) onDelete(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import React from "react";
import { DataTable } from "@/components/common/DataTable";
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
          <div className="flex justify-end">
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
                  onSelect={() => {
                    // Menu will close automatically, then we can open dialog
                    requestAnimationFrame(() => {
                      if (onEdit) onEdit(row.original);
                    });
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    {/* The onSelect handler prevents the dropdown from closing when this item is clicked */}
                    <DropdownMenuItem
                      className="text-red-500"
                      onSelect={(e) => e.preventDefault()}
                    >
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the customer and all associated data from our
                        servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDelete) onDelete(row.original.id);
                        }}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  if (!customers || !Array.isArray(customers)) {
    return <div>Loading...</div>;
  }

  return (
    <DataTable
      data={customers}
      columns={columns}
      filterColumn="name"
      onRowClick={(row) => onRowClick(row.id)}
    />
  );
}

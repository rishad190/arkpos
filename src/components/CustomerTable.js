import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CustomerTable({
  customers,
  getCustomerDue,
  onRowClick,
  onEdit,
  onDelete,
  currentPage,
  customersPerPage,
}) {
  const paginatedCustomers = customers.slice(
    (currentPage - 1) * customersPerPage,
    currentPage * customersPerPage
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">Name</TableHead>
          <TableHead className="whitespace-nowrap hidden md:table-cell">
            Phone
          </TableHead>
          <TableHead className="whitespace-nowrap hidden md:table-cell">
            Address
          </TableHead>
          <TableHead className="whitespace-nowrap hidden md:table-cell">
            Store ID
          </TableHead>
          <TableHead className="text-right whitespace-nowrap">
            Due Amount
          </TableHead>
          <TableHead className="whitespace-nowrap">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedCustomers.map((customer) => {
          const dueAmount = getCustomerDue(customer.id);
          return (
            <TableRow
              key={customer.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => onRowClick(customer.id)}
            >
              <TableCell>
                <div>
                  {customer.name}
                  <div className="md:hidden text-sm text-gray-500">
                    <div>{customer.phone}</div>
                    <div className="truncate max-w-[200px]">
                      {customer?.address || ""}
                    </div>
                    <div>{customer.storeId}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {customer.phone}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div
                  className="truncate max-w-[200px]"
                  title={customer?.address || ""}
                >
                  {customer?.address || ""}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {customer.storeId}
              </TableCell>
              <TableCell
                className={`text-right whitespace-nowrap ${
                  dueAmount > 1000 ? "text-red-500" : ""
                }`}
              >
                ৳{dueAmount.toLocaleString()}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(customer);
                        }}
                      >
                        <span className="flex items-center">
                          <span className="md:hidden mr-2">✏️</span>
                          Edit
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(customer.id);
                        }}
                      >
                        <span className="flex items-center">
                          <span className="md:hidden mr-2">🗑️</span>
                          Delete
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

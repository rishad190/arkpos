"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/app/data-context";
import { CashMemoPrint } from "@/components/CashMemoPrint";

// Add Dialog imports for new customer creation
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Printer,
  FileDown,
  Save,
  CheckCircle,
  Check,
  ChevronsUpDown,
} from "lucide-react";

import { Toaster } from "@/components/ui/toaster";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function CashMemoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { customers, addTransaction, addDailyCashTransaction, addCustomer } =
    useData();
  const [customerId, setCustomerId] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openPhonePopover, setOpenPhonePopover] = useState(false);
  const [phoneSearchValue, setPhoneSearchValue] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    storeId: "STORE1",
  });

  const [memoData, setMemoData] = useState({
    date: new Date().toISOString().split("T")[0],
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    memoNumber: `MEMO-${Date.now()}`,
    deposit: 0, // Changed from empty string to 0
  });

  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    quality: "",
    price: "",
    total: 0,
  });

  const originalContent = useRef(null);

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) {
      alert("Please enter product name");
      return;
    }

    if (
      !newProduct.quality ||
      isNaN(parseFloat(newProduct.quality)) ||
      parseFloat(newProduct.quality) <= 0
    ) {
      alert("Please enter valid quality");
      return;
    }

    if (
      !newProduct.price ||
      isNaN(parseFloat(newProduct.price)) ||
      parseFloat(newProduct.price) <= 0
    ) {
      alert("Please enter valid price");
      return;
    }

    const quality = parseFloat(newProduct.quality);
    const price = parseFloat(newProduct.price);
    const total = quality * price;

    setProducts([
      ...products,
      {
        name: newProduct.name.trim(),
        quality,
        price,
        total,
      },
    ]);

    setNewProduct({
      name: "",
      quality: "",
      price: "",
      total: 0,
    });
  };

  const grandTotal = products.reduce((sum, product) => sum + product.total, 0);

  const handlePrint = () => {
    const printContent = document.getElementById("print-section");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Memo</title>
          <style>
            @page {
              size: A4;
              margin: 1cm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Arial', sans-serif;
            }
            body {
              padding: 1.5rem;
              color: #333;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 3rem;
              padding-bottom: 1rem;
              border-bottom: 2px solid #eaeaea;
            }
            .logo {
              max-width: 120px;
              margin-bottom: 1rem;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #1a1a1a;
              margin-bottom: 0.5rem;
            }
            .memo-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2rem;
            }
            .customer-details, .memo-details {
              flex: 1;
              max-width: 300px;
            }
            .memo-details {
              text-align: right;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 2rem 0;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #eaeaea;
            }
            th {
              background-color: #f8f8f8;
              font-weight: bold;
            }
            .text-right {
              text-align: right;
            }
            .grand-total {
              margin-top: 2rem;
              text-align: right;
              font-size: 18px;
              font-weight: bold;
            }
            .footer {
              margin-top: 4rem;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .footer-line {
              margin-top: 2rem;
              padding-top: 1rem;
              border-top: 1px solid #eaeaea;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <div class="footer">
            <p>Thank you for your business!</p>
            <div class="footer-line">
              <p>Sky Fabric's - Quality Fabrics, Trusted Service</p>
              <p>Mobile: 01713-458086, 01738-732971</p>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleSelectCustomer = (customer) => {
    setMemoData({
      ...memoData,
      customerPhone: customer.phone,
      customerName: customer.name,
      customerAddress: customer.address || "",
    });
    setCustomerId(customer.id);
    setOpenPhonePopover(false);
  };

  const handleSaveMemo = async () => {
    if (products.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product",
        variant: "destructive",
      });
      return;
    }

    if (!customerId) {
      toast({
        title: "Error",
        description: "Please select a valid customer",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const deposit = Number(memoData.deposit) || 0;

      // Log transaction data for debugging
      console.log("Saving transaction:", {
        customerId,
        date: memoData.date,
        memoNumber: memoData.memoNumber,
        total: grandTotal,
        deposit: deposit,
        due: grandTotal - deposit,
        details: products
          .map((p) => `${p.name} (${p.quality} x ৳${p.price})`)
          .join(", "),
        type: "SALE",
        storeId: "STORE1",
      });

      // Create transaction for customer
      const transaction = {
        customerId,
        date: memoData.date,
        memoNumber: memoData.memoNumber,
        total: grandTotal,
        deposit: deposit,
        due: grandTotal - deposit,
        details: products
          .map((p) => `${p.name} (${p.quality} x ৳${p.price})`)
          .join(", "),
        type: "SALE",
        storeId: "STORE1",
        createdAt: new Date().toISOString(),
      };

      // Wait for transaction to be added
      const transactionResult = await addTransaction(transaction);
      console.log("Transaction result:", transactionResult);

      // Only proceed with cash transaction if deposit exists and transaction was successful
      if (deposit > 0 && transactionResult) {
        const cashTransaction = {
          date: memoData.date,
          description: `Cash Memo: ${memoData.memoNumber} - ${memoData.customerName}`,
          cashIn: deposit,
          cashOut: 0,
          category: "Sales",
          createdAt: new Date().toISOString(),
        };

        await addDailyCashTransaction(cashTransaction);
      }

      setSaveSuccess(true);
      toast({
        title: "Success",
        description: "Cash memo saved successfully",
      });

      // Reset form after delay
      setTimeout(() => {
        setMemoData({
          date: new Date().toISOString().split("T")[0],
          customerName: "",
          customerPhone: "",
          customerAddress: "",
          memoNumber: `MEMO-${Date.now()}`,
          deposit: 0,
        });
        setProducts([]);
        setCustomerId("");
        setSaveSuccess(false);
        router.push("/cashbook");
      }, 2000);
    } catch (error) {
      console.error("Error saving memo:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save memo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name.trim() || !newCustomerData.phone.trim()) {
      toast({
        title: "Error",
        description: "Name and phone number are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const customer = await addCustomer({
        ...newCustomerData,
        createdAt: new Date().toISOString(),
      });

      setMemoData({
        ...memoData,
        customerName: newCustomerData.name,
        customerPhone: newCustomerData.phone,
        customerAddress: newCustomerData.address || "",
      });

      setCustomerId(customer.id);
      setIsCreatingCustomer(false);
      setNewCustomerData({
        name: "",
        phone: "",
        address: "",
        email: "",
        storeId: "STORE1",
      });

      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    } catch (error) {
      console.error("Error creating customer:", error);
      toast({
        title: "Error",
        description: "Failed to create customer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePhoneChange = (e) => {
    const phoneNumber = e.target.value;
    setMemoData({ ...memoData, customerPhone: phoneNumber });
    setPhoneSearchValue(phoneNumber);

    // Check if customer exists with this phone number
    const existingCustomer = customers?.find((c) => c.phone === phoneNumber);

    if (!existingCustomer && phoneNumber) {
      setNewCustomerData((prev) => ({ ...prev, phone: phoneNumber }));
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4 md:space-y-6">
      <Toaster />
      <Card className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            {/* Date field */}
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={memoData.date}
                onChange={(e) =>
                  setMemoData({ ...memoData, date: e.target.value })
                }
              />
            </div>
            {/* Customer Name field */}
            <div>
              <label className="text-sm font-medium">Customer Name</label>
              <Input
                value={memoData.customerName}
                onChange={(e) =>
                  setMemoData({ ...memoData, customerName: e.target.value })
                }
                placeholder="Enter customer name"
              />
            </div>
            {/* Phone Number field with customer search/create */}
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <div className="relative">
                <Popover
                  open={openPhonePopover}
                  onOpenChange={setOpenPhonePopover}
                >
                  <PopoverTrigger asChild>
                    <div className="flex items-center">
                      <Input
                        value={memoData.customerPhone}
                        onChange={handlePhoneChange}
                        placeholder="Enter phone number"
                        className="w-full"
                      />
                      <Button
                        variant="ghost"
                        role="combobox"
                        aria-expanded={openPhonePopover}
                        className="absolute right-0 h-full px-3"
                        onClick={() => setOpenPhonePopover(!openPhonePopover)}
                      >
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search customers..."
                        value={phoneSearchValue}
                        onValueChange={setPhoneSearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                              No customer found with this number
                            </p>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setIsCreatingCustomer(true);
                                setOpenPhonePopover(false);
                              }}
                            >
                              Create New Customer
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {customers
                            ?.filter(
                              (customer) =>
                                customer.phone.includes(phoneSearchValue) ||
                                customer.name
                                  .toLowerCase()
                                  .includes(phoneSearchValue.toLowerCase())
                            )
                            .map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.phone}
                                onSelect={() => handleSelectCustomer(customer)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    memoData.customerPhone === customer.phone
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{customer.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {customer.phone}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Deposit Amount</label>
              <Input
                type="number"
                min="0"
                step="any"
                value={memoData.deposit}
                onChange={(e) =>
                  setMemoData({
                    ...memoData,
                    deposit: e.target.value,
                  })
                }
                placeholder="Enter deposit amount"
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Memo Number</label>
              <Input
                value={memoData.memoNumber}
                onChange={(e) =>
                  setMemoData({ ...memoData, memoNumber: e.target.value })
                }
                placeholder="Enter memo number"
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={memoData.customerAddress}
                onChange={(e) =>
                  setMemoData({ ...memoData, customerAddress: e.target.value })
                }
                placeholder="Enter address"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              placeholder="Product name"
              value={newProduct.name}
              onChange={(e) =>
                setNewProduct({ ...newProduct, name: e.target.value })
              }
              required
            />
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="Quality"
              value={newProduct.quality}
              onChange={(e) =>
                setNewProduct({ ...newProduct, quality: e.target.value })
              }
              required
            />
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="Price"
              value={newProduct.price}
              onChange={(e) =>
                setNewProduct({ ...newProduct, price: e.target.value })
              }
              required
            />
            <Button onClick={handleAddProduct} className="w-full md:w-auto">
              Add Product
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Product</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Quality
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Price
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="whitespace-nowrap">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {product.quality}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      ৳{parseFloat(product.price).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      ৳{product.total.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">
                    Grand Total:
                  </TableCell>
                  <TableCell className="text-right font-bold whitespace-nowrap">
                    ৳{grandTotal.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-right font-medium text-green-600"
                  >
                    Deposit:
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap text-green-600">
                    ৳{Number(memoData.deposit || 0).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-right font-medium text-red-600"
                  >
                    Due Amount:
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap text-red-600">
                    ৳
                    {(
                      grandTotal - Number(memoData.deposit || 0)
                    ).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <Button
          variant="outline"
          className="w-full sm:w-auto print:hidden"
          onClick={handlePrint}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Memo
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto print:hidden"
          // onClick={handleExportPDF}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
        <Button
          className="w-full sm:w-auto print:hidden"
          onClick={handleSaveMemo}
          disabled={isSaving || saveSuccess || products.length === 0}
        >
          {saveSuccess ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Saved!
            </>
          ) : isSaving ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Memo
            </>
          )}
        </Button>
      </div>

      <div id="print-section" className="hidden print:block">
        <CashMemoPrint
          memoData={memoData}
          products={products}
          grandTotal={grandTotal}
        />
      </div>

      {/* New Customer Creation Dialog */}
      <Dialog open={isCreatingCustomer} onOpenChange={setIsCreatingCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={newCustomerData.name}
                onChange={(e) =>
                  setNewCustomerData({
                    ...newCustomerData,
                    name: e.target.value,
                  })
                }
                placeholder="Enter customer name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone *</label>
              <Input
                value={newCustomerData.phone}
                onChange={(e) =>
                  setNewCustomerData({
                    ...newCustomerData,
                    phone: e.target.value,
                  })
                }
                placeholder="Enter phone number"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={newCustomerData.email}
                onChange={(e) =>
                  setNewCustomerData({
                    ...newCustomerData,
                    email: e.target.value,
                  })
                }
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={newCustomerData.address}
                onChange={(e) =>
                  setNewCustomerData({
                    ...newCustomerData,
                    address: e.target.value,
                  })
                }
                placeholder="Enter address"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreatingCustomer(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCustomer}>Create Customer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

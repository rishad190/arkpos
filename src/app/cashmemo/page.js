"use client";
import { useState, useMemo } from "react"; // REMOVED useRef
import logger from "@/utils/logger";
import { useRouter } from "next/navigation";
import { useData } from "@/contexts/data-context";
import { CashMemoPrint } from "@/components/CashMemoPrint";
import { TransactionErrorBoundary } from "@/components/ErrorBoundary";
// --- REMOVED: useReactToPrint ---

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { calculateFifoSale } from "@/lib/inventory-utils";
import { formatColorDisplay, formatProductWithColor } from "@/lib/color-utils";
import * as utils from "@/lib/utils"; // We will use utils.printElement
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function CashMemoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    customers,
    addTransaction,
    addDailyCashTransaction,
    fabrics,
    reduceInventory,
  } = useData();
  const [customerId, setCustomerId] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openPhonePopover, setOpenPhonePopover] = useState(false);
  const [phoneSearchValue, setPhoneSearchValue] = useState("");
  const [openProductPopover, setOpenProductPopover] = useState(false);
  const [productSearchValue, setProductSearchValue] = useState("");
  const [memoData, setMemoData] = useState({
    date: new Date().toISOString().split("T")[0],
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    memoNumber: `MEMO-${Date.now()}`,
    deposit: 0,
  });

  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    quantity: "",
    price: "",
    total: 0,
    cost: 0,
    profit: 0,
    color: "",
  });

  const availableColors = useMemo(() => {
    if (!newProduct.name || !fabrics) return [];

    const selectedFabric = fabrics.find(
      (f) =>
        f && f.name && f.name.toLowerCase() === newProduct.name.toLowerCase()
    );

    if (!selectedFabric?.batches) return [];

    return selectedFabric.batches
      .flatMap((batch) => batch.items || [])
      .reduce((colors, item) => {
        if (!item?.colorName || !item?.quantity) return colors;
        const existing = colors.find((c) => c.color === item.colorName);
        if (existing) {
          existing.quantity += Number(item.quantity);
        } else {
          colors.push({
            color: item.colorName,
            quantity: Number(item.quantity),
          });
        }
        return colors;
      }, [])
      .filter((c) => c.quantity > 0);
  }, [newProduct.name, fabrics]);

  // This function now matches the 'bhaiyapos' repo logic
  const handlePrint = () => {
    utils.printElement("print-section");
  };

  const handleAddProduct = () => {
    // --- Enhanced Validation with better error messages ---
    if (!newProduct.name.trim()) {
      toast({
        title: "Product Required",
        description: "Please select a product from the inventory",
        variant: "destructive",
      });
      return;
    }

    const quantityNum = parseFloat(newProduct.quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    const priceNum = parseFloat(newProduct.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Additional validation for decimal precision
    if (
      quantityNum % 1 !== 0 &&
      quantityNum.toString().split(".")[1]?.length > 3
    ) {
      toast({
        title: "Invalid Quantity Format",
        description: "Quantity can have up to 3 decimal places",
        variant: "destructive",
      });
      return;
    }

    if (priceNum % 1 !== 0 && priceNum.toString().split(".")[1]?.length > 2) {
      toast({
        title: "Invalid Price Format",
        description: "Price can have up to 2 decimal places",
        variant: "destructive",
      });
      return;
    }
    // --- End Validation ---

    const total = quantityNum * priceNum;

    // Find fabric with batches from the new data structure
    // First try to find by fabricId if available, otherwise by name
    const fabric = newProduct.fabricId
      ? fabrics.find((f) => f && f.id === newProduct.fabricId)
      : fabrics.find(
          (f) =>
            f &&
            f.name &&
            f.name.toLowerCase() === newProduct.name.toLowerCase()
        );

    if (!fabric) {
      toast({
        title: "Error",
        description: "Fabric not found in inventory",
        variant: "destructive",
      });
      return;
    }

    // Ensure fabricId is set
    if (!newProduct.fabricId) {
      setNewProduct((prev) => ({ ...prev, fabricId: fabric.id }));
    }

    // Batches are now directly in the fabric object
    const batches = fabric.batches || [];

    // --- Try-catch for calculateFifoSale ---
    try {
      // Build FIFO-compatible batch list (each batch has a top-level quantity)
      const fifoBatches = (batches || [])
        .map((batch) => {
          const items = batch.items || [];
          const qty = newProduct.color
            ? items.reduce(
                (s, it) =>
                  s +
                  (it?.colorName === newProduct.color
                    ? Number(it.quantity || 0)
                    : 0),
                0
              )
            : items.reduce((s, it) => s + (Number(it?.quantity) || 0), 0);

          return {
            id: batch.id || batch.batchNumber || batch.createdAt,
            quantity: qty,
            unitCost:
              Number(batch.unitCost || batch.costPerPiece || batch.unit_cost) ||
              0,
            createdAt: batch.purchaseDate || batch.createdAt,
            color: newProduct.color || null, // Add color property for FIFO filtering
          };
        })
        .filter((b) => Number(b.quantity) > 0);

      // Total available stock for the selection
      const availableStock = fifoBatches.reduce(
        (sum, b) => sum + Number(b.quantity || 0),
        0
      );

      if (availableStock < quantityNum) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${availableStock} units available${
            newProduct.color ? ` in ${newProduct.color}` : ""
          }`,
          variant: "destructive",
        });
        return;
      }

      // Debug log for stock validation
      logger.debug("[CashMemo] Stock validation passed:", {
        fabricName: fabric.name,
        productQuantity: quantityNum,
        availableStock,
        color: newProduct.color,
        fifoBatches: fifoBatches,
      });

      const { totalCost } = calculateFifoSale(
        fifoBatches,
        quantityNum,
        newProduct.color || null
      ); // Pass color, or null if not specified
      const profit = total - totalCost;

      setProducts([
        ...products,
        {
          name: newProduct.name.trim(),
          quantity: quantityNum, // Use consistent quantity naming
          fabricId: fabric.id, // Directly use fabric.id
          price: priceNum,
          total,
          cost: totalCost,
          profit,
          color: newProduct.color,
          unit: fabric.unit || "piece", // Include unit from fabric
        },
      ]);

      // Reset form with all fields cleared
      setNewProduct({
        name: "",
        quantity: "",
        price: "",
        total: 0,
        cost: 0,
        profit: 0,
        color: "",
      });
      // Reset product search value as well if needed
      setProductSearchValue("");
    } catch (error) {
      logger.error("Error calculating cost or adding product:", error);
      toast({
        title: "Error Adding Product",
        // Display specific error like insufficient stock if available
        description:
          error.message ||
          "Could not add product. Please check stock or details.",
        variant: "destructive",
      });
    }
    // --- End Try-catch ---
  };

  const grandTotal = products.reduce((sum, product) => sum + product.total, 0);
  const totalCost = products.reduce((sum, product) => sum + product.cost, 0);
  const totalProfit = products.reduce(
    (sum, product) => sum + product.profit,
    0
  );

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

  const handleSelectProduct = (fabric) => {
    // Validate fabric ID before proceeding
    if (!fabric.id || fabric.id === "0" || fabric.id === "") {
      logger.error("[CashMemo] Invalid fabric ID selected:", fabric);
      toast({
        title: "Invalid Product",
        description:
          "Selected product has an invalid ID. Please choose a different product.",
        variant: "destructive",
      });
      setOpenProductPopover(false);
      return;
    }

    // Get available colors with quantities
    const availableColors = (fabric.batches || [])
      .flatMap((batch) => batch.items || [])
      .reduce((colors, item) => {
        if (!item?.colorName || !item?.quantity) return colors;
        const existing = colors.find((c) => c.color === item.colorName);
        if (existing) {
          existing.quantity += Number(item.quantity);
        } else {
          colors.push({
            color: item.colorName,
            quantity: Number(item.quantity),
          });
        }
        return colors;
      }, [])
      .filter((c) => c.quantity > 0);

    // Debug log for fabric selection
    logger.debug("[CashMemo] Selected fabric:", {
      name: fabric.name,
      id: fabric.id,
      availableColorsCount: availableColors.length,
    });

    // Update the new product state
    setNewProduct({
      ...newProduct,
      name: fabric.name,
      color: "", // Reset color
      fabricId: fabric.id,
      unit: fabric.unit || "piece",
      availableColors, // Store available colors for later use
    });

    setOpenProductPopover(false);
  };

  const handlePhoneChange = (e) => {
    setMemoData({ ...memoData, customerPhone: e.target.value });
  };

  const handleSaveMemo = async () => {
    if (products.length === 0) {
      toast({
        title: "No Products Added",
        description: "Please add at least one product to create a memo",
        variant: "destructive",
      });
      return;
    }

    if (!customerId || !memoData.customerName.trim()) {
      toast({
        title: "Customer Required",
        description: "Please select or enter a valid customer",
        variant: "destructive",
      });
      return;
    }

    if (!memoData.customerPhone.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter customer phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate deposit amount
    const deposit = Number(memoData.deposit) || 0;
    if (deposit < 0) {
      toast({
        title: "Invalid Deposit",
        description: "Deposit amount cannot be negative",
        variant: "destructive",
      });
      return;
    }

    if (deposit > grandTotal) {
      toast({
        title: "Invalid Deposit",
        description: "Deposit amount cannot exceed grand total",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const deposit = Number(memoData.deposit) || 0;

      // Enhanced stock validation before saving with debug logging
      let validationFailed = false;
      let validationError = "";

      for (const product of products) {
        // Enhanced fabric lookup with better error handling
        let fabric = null;

        // First try to find by fabricId
        if (product.fabricId) {
          fabric = fabrics.find((f) => f && f.id === product.fabricId);
        }

        // If not found by fabricId, try by name
        if (!fabric && product.name) {
          fabric = fabrics.find(
            (f) =>
              f && f.name && f.name.toLowerCase() === product.name.toLowerCase()
          );

          // If found by name, update the product's fabricId for consistency
          if (fabric && fabric.id) {
            product.fabricId = fabric.id;
          }
        }

        if (!fabric) {
          validationFailed = true;
          validationError = `Fabric "${product.name}" not found in inventory. Please select a valid product.`;
          break;
        }

        const batches = fabric.batches || [];
        const fifoBatches = batches
          .map((batch) => {
            const items = batch.items || [];
            const qty = product.color
              ? items.reduce(
                  (s, it) =>
                    s +
                    (it?.colorName === product.color
                      ? Number(it.quantity || 0)
                      : 0),
                  0
                )
              : items.reduce((s, it) => s + (Number(it?.quantity) || 0), 0);

            return {
              id: batch.id || batch.batchNumber || batch.createdAt,
              quantity: qty,
              unitCost:
                Number(
                  batch.unitCost || batch.costPerPiece || batch.unit_cost
                ) || 0,
              createdAt: batch.purchaseDate || batch.createdAt,
              color: product.color || null,
            };
          })
          .filter((b) => Number(b.quantity) > 0);

        const availableStock = fifoBatches.reduce(
          (sum, b) => sum + Number(b.quantity || 0),
          0
        );

        if (availableStock < product.quantity) {
          validationFailed = true;
          validationError = `Only ${availableStock} units available for ${
            product.name
          }${product.color ? ` in ${product.color}` : ""}`;
          break;
        }

        // Debug log for save-time validation
        logger.debug("[CashMemo] Save-time stock validation:", {
          fabricName: fabric.name,
          productQuantity: product.quantity,
          availableStock,
          color: product.color,
          fifoBatchesCount: fifoBatches.length,
        });
      }

      if (validationFailed) {
        toast({
          title: "Stock Validation Failed",
          description: validationError,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Create transaction for customer
      const transaction = {
        customerId,
        date: memoData.date,
        memoNumber: memoData.memoNumber,
        total: grandTotal,
        totalCost: totalCost, // Add totalCost
        deposit: deposit,
        due: grandTotal - deposit,
        details: products
          .map(
            (p) => `${formatProductWithColor(p)} (${p.quantity} x ৳${p.price})`
          )
          .join(", "),
        type: "SALE",
        storeId: "STORE1", // Consider making this dynamic if needed
        createdAt: new Date().toISOString(),
        products: products, // Include product details for inventory update logic
      };

      // Enhanced debugging for fabric validation
      if (process.env.NODE_ENV !== "production") {
        try {
          logger.debug("[CashMemo] transaction payload:", transaction);
          logger.debug("[CashMemo] Current fabrics data:", fabrics);
          logger.debug("[CashMemo] Products to save:", products);

          // Validate fabric IDs before proceeding
          const invalidProducts = products.filter((p) => !p.fabricId);
          if (invalidProducts.length > 0) {
            logger.error(
              "[CashMemo] Products missing fabricId:",
              invalidProducts
            );
          }

          // Verify fabrics exist
          for (const product of products) {
            const fabric = fabrics.find((f) => f && f.id === product.fabricId);
            if (!fabric) {
              logger.error(`[CashMemo] Fabric not found for product:`, product);
            } else {
              logger.debug(
                `[CashMemo] Found fabric for ${product.name}:`,
                fabric.name,
                fabric.id
              );
            }
          }
        } catch (e) {
          /* ignore logging errors */
        }
      }

      // Wait for transaction to be added
      const transactionId = await addTransaction(transaction);

      // Double-check fabric IDs before reducing inventory
      const productsWithValidFabricIds = products
        .map((product) => {
          // Ensure fabricId is set and valid
          if (
            !product.fabricId ||
            product.fabricId === "0" ||
            product.fabricId === ""
          ) {
            logger.warn("[CashMemo] Product with invalid fabricId:", product);
            const fabric = fabrics.find(
              (f) =>
                f &&
                f.id &&
                f.id !== "0" &&
                f.id !== "" &&
                f.name.toLowerCase() === product.name.toLowerCase()
            );
            if (fabric) {
              logger.info(
                `[CashMemo] Fixed fabricId for ${product.name}: ${fabric.id}`
              );
              return { ...product, fabricId: fabric.id };
            } else {
              logger.error(
                `[CashMemo] No valid fabric found for ${product.name}`
              );
              return null;
            }
          }
          return product;
        })
        .filter(
          (product) =>
            product &&
            product.fabricId &&
            product.fabricId !== "0" &&
            product.fabricId !== ""
        );

      if (productsWithValidFabricIds.length !== products.length) {
        const invalidCount =
          products.length - productsWithValidFabricIds.length;
        throw new Error(
          `${invalidCount} product(s) have invalid fabric IDs. Please reselect the products.`
        );
      }

      // Debug log before reducing inventory
      logger.debug(
        "[CashMemo] Products with valid fabric IDs:",
        productsWithValidFabricIds
      );

      // Reduce inventory after successful transaction
      await reduceInventory(productsWithValidFabricIds);

      // Only proceed with cash transaction if deposit exists and transaction was successful
      if (deposit > 0 && transactionId) {
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
        router.push("/cashbook"); // Navigate to cashbook after save
      }, 2000);
    } catch (error) {
      logger.error("Error saving memo:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save memo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TransactionErrorBoundary>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4 md:space-y-6">
        <Toaster />
        {isSaving && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg border flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-sm font-medium">Saving memo...</span>
            </div>
          </div>
        )}
        <Card className="p-4 md:p-6 no-print">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
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
                          onChange={(e) => {
                            handlePhoneChange(e);
                            setPhoneSearchValue(e.target.value);
                          }}
                          placeholder="Enter or search phone number"
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
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                    >
                      <Command
                        shouldFilter={false} /* Filtering done via state */
                      >
                        <CommandInput
                          placeholder="Search customers..."
                          value={phoneSearchValue}
                          onValueChange={setPhoneSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>No customer found.</CommandEmpty>
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
                                  value={`${customer.name} ${customer.phone}`} // Unique value for selection
                                  onSelect={() =>
                                    handleSelectCustomer(customer)
                                  }
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      customerId === customer.id // Check against customerId
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
                    setMemoData({
                      ...memoData,
                      customerAddress: e.target.value,
                    })
                  }
                  placeholder="Enter address"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 no-print">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-end">
              {/* Product Name Search/Select */}
              <div className="relative">
                <label className="text-sm font-medium">Product Name *</label>
                <Popover
                  open={openProductPopover}
                  onOpenChange={setOpenProductPopover}
                >
                  <PopoverTrigger asChild>
                    <div className="relative flex items-center mt-1">
                      <Input
                        placeholder="Search or select product..."
                        value={productSearchValue || newProduct.name} // Display search value or selected name
                        onChange={(e) => {
                          setProductSearchValue(e.target.value);
                          // Optionally clear selected product name if user starts typing
                          if (
                            newProduct.name &&
                            e.target.value !== newProduct.name
                          ) {
                            setNewProduct({ ...newProduct, name: "" });
                          }
                          setOpenProductPopover(true); // Open popover when typing
                        }}
                        required
                        className="w-full pr-10" // Add padding for the button
                      />
                      <Button
                        variant="ghost"
                        role="combobox"
                        aria-expanded={openProductPopover}
                        className="absolute right-0 h-full px-3"
                        onClick={() =>
                          setOpenProductPopover(!openProductPopover)
                        }
                      >
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search products..."
                        value={productSearchValue}
                        onValueChange={setProductSearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          {fabrics
                            ?.filter(
                              (fabric) =>
                                fabric &&
                                fabric.name &&
                                fabric.name
                                  .toLowerCase()
                                  .includes(productSearchValue.toLowerCase())
                            )
                            .map((fabric) => {
                              // Get total quantity across all batches and colors
                              const totalQuantity = (
                                fabric.batches || []
                              ).reduce((sum, batch) => {
                                if (!batch?.items) return sum;
                                return (
                                  sum +
                                  batch.items.reduce(
                                    (batchSum, item) =>
                                      batchSum + (Number(item?.quantity) || 0),
                                    0
                                  )
                                );
                              }, 0);

                              return (
                                <CommandItem
                                  key={fabric.id}
                                  value={fabric.name} // Use name for selection value
                                  onSelect={() => {
                                    handleSelectProduct(fabric);
                                    setProductSearchValue(fabric.name); // Update search input on select
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      newProduct.name.toLowerCase() ===
                                        fabric.name.toLowerCase()
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col w-full">
                                    <div className="flex justify-between w-full">
                                      <span className="font-medium">
                                        {fabric.name}
                                      </span>
                                      <span className="text-muted-foreground text-sm">
                                        {totalQuantity.toFixed(2)} {fabric.unit}
                                      </span>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                      {(fabric.batches || [])
                                        .flatMap((batch) => batch.items || [])
                                        .reduce((colors, item) => {
                                          if (
                                            !item?.colorName ||
                                            !item?.quantity
                                          )
                                            return colors;
                                          const existing = colors.find(
                                            (c) => c.color === item.colorName
                                          );
                                          if (existing) {
                                            existing.quantity += Number(
                                              item.quantity
                                            );
                                          } else {
                                            colors.push({
                                              color: item.colorName,
                                              quantity: Number(item.quantity),
                                            });
                                          }
                                          return colors;
                                        }, [])
                                        .filter((c) => c.quantity > 0)
                                        .map(({ color, quantity }) => (
                                          <span
                                            key={color}
                                            className="text-xs px-2 py-0.5 rounded-full bg-muted"
                                          >
                                            {color} ({quantity})
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                </CommandItem>
                              );
                            })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {/* Color Select */}
              <div>
                <label className="text-sm font-medium">Color</label>
                <Select
                  value={newProduct.color}
                  onValueChange={(value) =>
                    setNewProduct({
                      ...newProduct,
                      color: value === "all" ? "" : value,
                    })
                  } // Handle 'All Colors' selection
                  disabled={!newProduct.name} // Only disable if no product selected
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colors</SelectItem>
                    {availableColors
                      .filter(({ quantity }) => quantity > 0)
                      .sort((a, b) => b.quantity - a.quantity)
                      .map(({ color, quantity }) => (
                        <SelectItem key={color} value={color}>
                          {color} ({quantity.toFixed(2)} {newProduct.unit})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Quantity Input */}
              <div>
                <label className="text-sm font-medium">Quantity *</label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Enter quantity"
                  value={newProduct.quantity}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, quantity: e.target.value })
                  }
                  required
                  className="mt-1"
                />
              </div>
              {/* Price Input */}
              <div>
                <label className="text-sm font-medium">Price *</label>
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
                  className="mt-1"
                />
              </div>
              {/* Add Button */}
              <Button
                onClick={handleAddProduct}
                className="w-full md:w-auto"
                disabled={
                  !newProduct.name || !newProduct.quantity || !newProduct.price
                }
              >
                Add
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Product</TableHead>
                    <TableHead className="whitespace-nowrap">Color</TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Quantity
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Price
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Total
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Profit
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell className="whitespace-nowrap">
                        {product.name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatColorDisplay(product.color)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {typeof product.quantity === "number"
                          ? product.quantity.toFixed(2)
                          : product.quantity}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        ৳{parseFloat(product.price).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        ৳{product.total.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        ৳
                        {product.profit.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-bold">
                      Grand Total:
                    </TableCell>
                    <TableCell className="text-right font-bold whitespace-nowrap">
                      ৳{grandTotal.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-right font-bold text-green-600"
                    >
                      Total Profit:
                    </TableCell>
                    <TableCell className="text-right font-bold whitespace-nowrap text-green-600">
                      ৳
                      {totalProfit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
                      colSpan={5}
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

        <div className="flex flex-col sm:flex-row justify-end gap-4 no-print">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Memo
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" disabled>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            className="w-full sm:w-auto"
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
                <div className="mr-2 h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
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

        {/* --- THIS IS THE FIX --- */}
        {/* The ref={printRef} is removed. The component is just in a div with the correct ID */}
        <div id="print-section" className="hidden print:block">
          <CashMemoPrint
            memoData={memoData}
            products={products}
            grandTotal={grandTotal}
          />
        </div>
        {/* --- END OF FIX --- */}
      </div>
    </TransactionErrorBoundary>
  );
}

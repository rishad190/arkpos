// components/SupplierPaymentDialog.js
"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SupplierPaymentDialog({
  supplier,
  open,
  onOpenChange,
  onPayment,
}) {
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    reference: "",
    paymentMethod: "cash",
  });

  const handleSubmit = () => {
    onPayment({
      ...paymentData,
      amount: Number(paymentData.amount),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment to {supplier?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="date"
            label="Payment Date"
            value={paymentData.date}
            onChange={(e) =>
              setPaymentData({ ...paymentData, date: e.target.value })
            }
          />
          <Input
            type="number"
            label="Amount"
            value={paymentData.amount}
            onChange={(e) =>
              setPaymentData({ ...paymentData, amount: e.target.value })
            }
          />
          <Input
            label="Reference Number"
            value={paymentData.reference}
            onChange={(e) =>
              setPaymentData({ ...paymentData, reference: e.target.value })
            }
          />
          <Button onClick={handleSubmit}>Record Payment</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

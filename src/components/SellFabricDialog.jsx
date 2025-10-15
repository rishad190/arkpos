import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function SellFabricDialog({ fabric, onSellFabric }) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const sellQuantity = parseFloat(quantity);
    if (isNaN(sellQuantity) || sellQuantity <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    if (sellQuantity > fabric.totalQuantity) {
      setError("Insufficient stock available");
      return;
    }

    try {
      await onSellFabric(fabric.id, sellQuantity);
      setOpen(false);
      setQuantity("");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Sell
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell Fabric</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h4 className="font-medium">{fabric.name}</h4>
            <p className="text-sm text-gray-500">
              Available: {fabric.totalQuantity}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={fabric.totalQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity to sell"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Sell</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

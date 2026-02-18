"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoans } from "@/contexts/loan-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function AddLoanDialog({ children }) {
  const { addLoan } = useLoans();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    type: "GIVEN", // 'GIVEN' or 'TAKEN'
    name: "",
    principal: "",
    rate: "",
    rateType: "MONTHLY", // 'MONTHLY' or 'YEARLY'
    startDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name || !formData.principal || !formData.rate) {
        alert("Please fill in all required fields");
        setLoading(false);
        return;
      }

      await addLoan({
        ...formData,
        principal: Number(formData.principal),
        rate: Number(formData.rate)
      });

      setOpen(false);
      // Reset form
      setFormData({
        type: "GIVEN",
        name: "",
        principal: "",
        rate: "",
        rateType: "MONTHLY",
        startDate: new Date().toISOString().split("T")[0],
        notes: ""
      });
    } catch (error) {
      console.error(error);
      alert("Failed to add loan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Loan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Loan Type */}
          <div className="space-y-2">
            <Label>Loan Type</Label>
            <RadioGroup 
              value={formData.type} 
              onValueChange={(val) => setFormData({...formData, type: val})}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="GIVEN" id="given" />
                <Label htmlFor="given">Loan Given (Asset)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="TAKEN" id="taken" />
                <Label htmlFor="taken">Loan Taken (Liability)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {formData.type === 'GIVEN' ? 'Borrower Name' : 'Lender Name'}
            </Label>
            <Input
              id="name"
              placeholder="Enter name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Principal Amount */}
          <div className="space-y-2">
            <Label htmlFor="principal">Principal Amount</Label>
            <Input
              id="principal"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.principal}
              onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Interest Rate */}
            <div className="space-y-2">
              <Label htmlFor="rate">Interest Rate (%)</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.01"
                placeholder="5"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                required
              />
            </div>

            {/* Rate Type */}
            <div className="space-y-2">
              <Label>Rate Frequency</Label>
              <Select 
                value={formData.rateType} 
                onValueChange={(val) => setFormData({...formData, rateType: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Start Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-muted-foreground">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate || ""}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="Additional details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Save Loan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

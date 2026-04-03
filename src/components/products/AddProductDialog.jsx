"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProducts } from "@/contexts/product-context";

export function AddProductDialog({ children }) {
  const { addProduct, addProductTransaction } = useProducts();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    initialCost: "", 
    partners: [{ name: "", amount: "" }],
    startDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const handleAddPartner = () => {
    setFormData(prev => ({ ...prev, partners: [...prev.partners, { name: "", amount: "" }] }));
  };

  const handlePartnerChange = (index, field, value) => {
    const newPartners = [...formData.partners];
    newPartners[index][field] = value;
    setFormData(prev => ({ ...prev, partners: newPartners }));
  };
  
  const handleRemovePartner = (index) => {
    setFormData(prev => ({
        ...prev, 
        partners: prev.partners.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name) {
        alert("Please provide a product name");
        setLoading(false);
        return;
      }

      const newProductId = await addProduct({
        name: formData.name,
        initialInvestment: Number(formData.initialCost || 0), // Maps to totalCost in backend
        startDate: formData.startDate,
        notes: formData.notes
      });

      for (const partner of formData.partners) {
          if (partner.name && Number(partner.amount) > 0) {
              await addProductTransaction(newProductId, {
                  type: "PARTNER_INVESTMENT",
                  amount: Number(partner.amount),
                  date: formData.startDate,
                  partnerName: partner.name,
                  note: "Initial Funding"
              });
          }
      }

      setOpen(false);
      // Reset form
      setFormData({
        name: "",
        initialCost: "",
        partners: [{ name: "", amount: "" }],
        startDate: new Date().toISOString().split("T")[0],
        notes: ""
      });
    } catch (error) {
      console.error(error);
      alert("Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Product/Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                placeholder="e.g. Container Shipment A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="initialInvestment">Initial Product Cost</Label>
                  <Input
                    id="initialInvestment"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={formData.initialCost}
                    onChange={(e) => setFormData({ ...formData, initialCost: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Total money spent to acquire/start this product.</p>
                </div>

                {/* Partners List */}
                <div className="space-y-3 bg-muted/30 p-3 rounded-md border border-dashed">
                  <Label>Partner Contributions (Optional)</Label>
                  {formData.partners.map((partner, index) => (
                      <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1 space-y-1">
                              <Input 
                                placeholder="Partner name..." 
                                value={partner.name} 
                                onChange={e => handlePartnerChange(index, "name", e.target.value)}
                              />
                          </div>
                          <div className="flex-1 space-y-1">
                              <Input 
                                type="number" 
                                placeholder="Amount..." 
                                value={partner.amount} 
                                onChange={e => handlePartnerChange(index, "amount", e.target.value)}
                              />
                          </div>
                          {formData.partners.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemovePartner(index)}>
                                  ✕
                              </Button>
                          )}
                      </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddPartner} className="w-full mt-2">
                      + Add Another Partner
                  </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
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
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Optional details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

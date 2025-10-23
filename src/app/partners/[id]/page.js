"use client";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";

export default function PartnerProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { partnerProducts } = useData();

  const product = partnerProducts?.find((p) => p.id === params.id);

  if (!product) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The product you are looking for does not exist or has been removed.
        </p>
        <Button onClick={() => router.push("/partners")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Partner Imports
        </Button>
      </div>
    );
  }

  // Helper to format numbers for display
  const formatNum = (num, digits = 2) =>
    Number(num || 0).toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <PageHeader
        title={product.productName}
        description={`Details for product import on ${new Date(
          product.createdAt || product.date
        ).toLocaleDateString()}`}
        actions={
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Import Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="font-semibold text-muted-foreground">Supplier</div>
            <div>{product.supplierName}</div>

            <div className="font-semibold text-muted-foreground">Date</div>
            <div>{new Date(product.date).toLocaleDateString()}</div>

            <div className="font-semibold text-muted-foreground">Quantity</div>
            <div>
              {formatNum(product.quantityMeter)} meters /{" "}
              {formatNum(product.quantityYard)} yards
            </div>

            <div className="font-semibold text-muted-foreground">
              Price per Meter
            </div>
            <div>${formatNum(product.priceDollar)}</div>

            <div className="font-semibold text-muted-foreground">
              Dollar Rate
            </div>
            <div>৳{formatNum(product.dollarRate)}</div>
          </CardContent>
        </Card>

        {/* Landed Cost Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Landed Cost</CardTitle>
            <CardDescription>Final cost per yard in Taka.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-4xl font-bold text-primary">
              ৳{formatNum(product.pricePerYard)}
            </p>
            <p className="text-sm text-muted-foreground">per yard</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown Card */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>
            Detailed breakdown of all costs involved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-muted-foreground">Total Price (USD)</span>
            <span className="font-semibold">
              ${formatNum(product.totalPriceDollar)}
            </span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-muted-foreground">Total Price (Taka)</span>
            <span className="font-semibold">
              ৳{formatNum(product.totalPriceTaka)}
            </span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-muted-foreground">Premium (Taka)</span>
            <span className="font-semibold">
              ৳{formatNum(product.premiumTaka)}
            </span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-muted-foreground">Other Costs (Taka)</span>
            <span className="font-semibold">
              ৳{formatNum(product.otherCostTaka)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 font-bold text-lg">
            <span>Total Landed Cost (Taka)</span>
            <span>৳{formatNum(product.totalCostTaka)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";
import React, { useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { calculateTotalQuantity } from "@/lib/inventory-utils";

export default function FabricDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { fabrics } = useData();

  // Find the current fabric with its batches (new flattened structure)
  const fabric = useMemo(() => {
    return fabrics?.find((f) => f.id === params.id);
  }, [fabrics, params.id]);

  const totalStock = useMemo(() => {
    if (!fabric) return 0;
    return calculateTotalQuantity(fabric);
  }, [fabric]);

  if (!fabric) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.push("/inventory")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory List
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Fabric not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">
            {fabric.name}
            <span className="text-lg text-muted-foreground ml-2">
              ({fabric.code})
            </span>
          </h2>
          <p className="text-muted-foreground">
            {fabric.category} - {fabric.description}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/inventory")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inventory List
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {totalStock.toFixed(2)}
            <span className="text-2xl text-muted-foreground ml-2">
              {fabric.unit || "pieces"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Total available stock across all containers.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-2xl font-semibold">Container Details</h3>
        {fabric.batches && fabric.batches.length > 0 ? (
          fabric.batches.map((batch) => {
            const batchTotalQuantity = (batch.items || []).reduce(
              (sum, item) => sum + (Number(item.quantity) || 0),
              0
            );

            return (
              <Card key={batch.id}>
                <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>
                      Container: {batch.containerNo || "N/A"}
                    </CardTitle>
                    <CardDescription>
                      Purchased on{" "}
                      {new Date(
                        batch.purchaseDate || batch.createdAt
                      ).toLocaleDateString()}
                      {batch.costPerPiece
                        ? ` at ৳${Number(batch.costPerPiece).toFixed(
                            2
                          )} per piece`
                        : ""}
                      .
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {batchTotalQuantity.toFixed(2)} {fabric.unit || "pieces"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      in this container
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  {batch.items && batch.items.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[70%]">Color</TableHead>
                          <TableHead className="text-right">
                            Quantity ({fabric.unit || "pieces"})
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batch.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.colorName || "No Color"}
                            </TableCell>
                            <TableCell className="text-right">
                              {Number(item.quantity).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No color items in this container.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No containers or batches have been added for this fabric yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

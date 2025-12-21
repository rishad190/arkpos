"use client";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function QuickStatCard({ title, value, icon: Icon, trend, trendValue }) {
  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div
          className={`flex items-center mt-2 text-sm ${
            trend === "up" ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend === "up" ? (
            <ArrowUpRight className="h-4 w-4 mr-1" />
          ) : (
            <ArrowDownRight className="h-4 w-4 mr-1" />
          )}
          <span>{trendValue} from last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

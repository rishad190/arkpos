"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";

export function FinancialSummary({ summary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 no-print">
      <Card className="overflow-hidden border-none shadow-md">
        <CardContent className="p-0">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 border-b border-green-100 dark:border-green-800">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                Total Cash In
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total cash received</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="p-4">
            <p className="text-2xl md:text-3xl font-bold text-green-600">
              ৳{summary.totalCashIn.toLocaleString()}
            </p>
            <Progress value={100} className="h-2 mt-2 bg-green-100" />
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-none shadow-md">
        <CardContent className="p-0">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 border-b border-red-100 dark:border-red-800">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Total Cash Out
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total expenses paid</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="p-4">
            <p className="text-2xl md:text-3xl font-bold text-red-600">
              ৳{summary.totalCashOut.toLocaleString()}
            </p>
            <Progress value={100} className="h-2 mt-2 bg-red-100" />
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-none shadow-md">
        <CardContent className="p-0">
          <div
            className={`${
              summary.availableCash >= 0 ? "bg-blue-50" : "bg-amber-50"
            } p-4 border-b`}
          >
            <div className="flex justify-between items-center">
              <h3
                className={`text-sm font-medium ${
                  summary.availableCash >= 0
                    ? "text-blue-800"
                    : "text-amber-800"
                }`}
              >
                Available Balance
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <RefreshCw
                      className={`h-4 w-4 ${
                        summary.availableCash >= 0
                          ? "text-blue-600"
                          : "text-amber-600"
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Current available balance</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="p-4">
            <p
              className={`text-2xl md:text-3xl font-bold ${
                summary.availableCash >= 0 ? "text-blue-600" : "text-amber-600"
              }`}
            >
              ৳{summary.availableCash.toLocaleString()}
            </p>
            <Progress
              value={Math.abs(
                (summary.availableCash / (summary.totalCashIn || 1)) * 100
              )}
              className={`h-2 mt-2 ${
                summary.availableCash >= 0 ? "bg-blue-100" : "bg-amber-100"
              }`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

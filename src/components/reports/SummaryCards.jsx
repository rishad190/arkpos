import { Card, CardContent } from "@/components/ui/card";

export function SummaryCards({ totals }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col">
            <h3 className="text-sm text-muted-foreground">Total Bill Amount</h3>
            <div className="mt-2 flex items-center">
              <p className="text-2xl font-bold text-blue-600">
                ৳{totals.totalBill.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col">
            <h3 className="text-sm text-muted-foreground">Total Deposit</h3>
            <div className="mt-2 flex items-center">
              <p className="text-2xl font-bold text-green-600">
                ৳{totals.totalDeposit.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col">
            <h3 className="text-sm text-muted-foreground">Total Due Amount</h3>
            <div className="mt-2 flex items-center">
              <p
                className={`text-2xl font-bold ${
                  totals.totalDue > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                ৳{totals.totalDue.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

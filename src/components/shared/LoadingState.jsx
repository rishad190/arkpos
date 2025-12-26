import { Loader2 } from "lucide-react";

export function LoadingState({
  title = "Loading...",
  description = "Please wait while we fetch the data",
}) {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          {[...Array(columns)].map((_, j) => (
            <td key={j} className="p-4">
              <div className="h-4 bg-gray-200 rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

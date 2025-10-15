"use client";
export function DebugPanel({ data }) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md">
      <details className="bg-gray-800 text-white p-4 rounded-lg shadow-lg">
        <summary className="cursor-pointer">Debug Info</summary>
        <pre className="mt-2 text-xs overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

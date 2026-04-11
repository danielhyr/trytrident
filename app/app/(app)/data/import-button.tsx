"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { triggerHistoricalImport } from "@/app/actions/data";

export function ImportButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);

    try {
      const res = await triggerHistoricalImport();

      if ("error" in res) {
        setResult(`Error: ${res.error}`);
      } else {
        const p = res.progress;
        const parts: string[] = [];
        if (p.customers_fetched > 0) parts.push(`${p.customers_fetched} customers`);
        if (p.orders_fetched > 0) parts.push(`${p.orders_fetched} orders`);
        parts.push(`${p.raw_events_inserted} events queued`);
        if (p.errors.length > 0) parts.push(`Errors: ${p.errors.join("; ")}`);
        setResult(parts.join(", "));
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-[--radius-card] border border-accent bg-white px-4 py-2 font-body text-sm font-medium text-accent transition-colors hover:bg-[#E6FAF9] disabled:opacity-50"
      >
        {loading ? "Importing..." : "Import Historical Data"}
      </button>
      {result && (
        <span className="font-data text-xs text-text-main-muted">{result}</span>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { triggerProcessing } from "@/app/actions/data";

export function ProcessButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);

    try {
      const res = await triggerProcessing();

      if ("error" in res) {
        setResult(`Error: ${res.error}`);
      } else {
        const s = res.stats;
        setResult(
          `Processed ${s.processed}, ${s.contacts_created} contacts created, ${s.contacts_updated} updated, ${s.events_created} events, ${s.errors} errors`
        );
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
        className="rounded-[--radius-card] bg-accent px-4 py-2 font-body text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Process Now"}
      </button>
      {result && (
        <span className="font-data text-xs text-text-main-muted">{result}</span>
      )}
    </div>
  );
}

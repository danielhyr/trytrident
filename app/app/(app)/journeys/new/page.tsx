"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as journeyActions from "@/app/actions/journeys";

export default function NewJourneyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);

    const result = await journeyActions.createJourney({
      name: name.trim(),
      graph: {
        nodes: [
          {
            id: "node_1",
            type: "trigger",
            position: { x: 250, y: 50 },
            data: { label: "Trigger", event_type: "" },
          },
        ],
        edges: [],
      },
    });

    if ("journey" in result) {
      router.push(`/journeys/${result.journey.id}`);
    } else {
      setCreating(false);
      alert(result.error);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-md">
        <h1 className="mb-6 font-headline text-2xl font-semibold text-text-main">
          New Journey
        </h1>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-text-main-muted">
            Journey Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="e.g., Abandoned Cart Recovery"
            autoFocus
            className="w-full rounded-md border border-card-border bg-white px-4 py-2.5 text-sm text-text-main outline-none focus:border-accent"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/journeys")}
            className="flex-1 rounded-md border border-card-border bg-white px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create & Open Canvas"}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-text-main-muted">
          Or ask the chat to build one: &ldquo;Create an abandoned cart journey&rdquo;
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { createApiKey, revokeApiKey } from "@/app/actions/api-keys";
import type { ApiKey } from "@/lib/api/api-keys";

interface Props {
  initialKeys: ApiKey[];
}

export function ApiKeyManager({ initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const ingestUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/ingest`
      : "/api/webhooks/ingest";

  async function handleCreate() {
    setCreating(true);
    setError(null);
    setNewKey(null);

    const res = await createApiKey(label || undefined);
    setCreating(false);

    if ("error" in res) {
      setError(res.error);
      return;
    }

    setNewKey(res.result.key);
    setLabel("");

    // Refresh list — add a placeholder with the new prefix
    const placeholder: ApiKey = {
      id: res.result.id,
      tenant_id: "",
      key_prefix: res.result.prefix,
      label: label || "Default",
      created_by: "",
      created_at: new Date().toISOString(),
      last_used_at: null,
      revoked_at: null,
    };
    setKeys((prev) => [placeholder, ...prev]);
  }

  async function handleRevoke(keyId: string) {
    setRevoking(keyId);
    const res = await revokeApiKey(keyId);
    setRevoking(null);

    if ("error" in res) {
      setError(res.error);
      return;
    }

    setKeys((prev) =>
      prev.map((k) =>
        k.id === keyId ? { ...k, revoked_at: new Date().toISOString() } : k
      )
    );
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const curlExample = newKey
    ? `curl -X POST ${ingestUrl} \\
  -H "Authorization: Bearer ${newKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"event_type":"custom.signup","email":"user@example.com","properties":{"plan":"pro"}}'`
    : `curl -X POST ${ingestUrl} \\
  -H "Authorization: Bearer trident_live_<your_key>" \\
  -H "Content-Type: application/json" \\
  -d '{"event_type":"custom.signup","email":"user@example.com","properties":{"plan":"pro"}}'`;

  return (
    <div className="space-y-6">
      {/* New key form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Key label (optional)"
          className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-main placeholder:text-text-main-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {creating ? "Generating…" : "Generate API Key"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* One-time key reveal */}
      {newKey && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-2">
          <p className="text-sm font-medium text-accent">
            Copy this key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-bg px-3 py-2 font-data text-xs text-text-main">
              {newKey}
            </code>
            <button
              onClick={() => handleCopy(newKey)}
              className="shrink-0 rounded-md border border-border px-3 py-2 text-xs text-text-main hover:bg-surface transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-text-main-muted hover:text-text-main"
          >
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* Key table */}
      {keys.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-4 py-2 text-left font-medium text-text-main-muted">Prefix</th>
                <th className="px-4 py-2 text-left font-medium text-text-main-muted">Label</th>
                <th className="px-4 py-2 text-left font-medium text-text-main-muted">Created</th>
                <th className="px-4 py-2 text-left font-medium text-text-main-muted">Last used</th>
                <th className="px-4 py-2 text-left font-medium text-text-main-muted">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-data text-xs text-text-main">
                    {key.key_prefix}…
                  </td>
                  <td className="px-4 py-3 text-text-main">{key.label}</td>
                  <td className="px-4 py-3 text-text-main-muted">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-text-main-muted">
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {key.revoked_at ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        Revoked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!key.revoked_at && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        disabled={revoking === key.id}
                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                      >
                        {revoking === key.id ? "Revoking…" : "Revoke"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {keys.length === 0 && (
        <p className="text-sm text-text-main-muted">No API keys yet. Generate one above.</p>
      )}

      {/* Endpoint reference */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-text-main-muted uppercase tracking-wide">
          Ingest endpoint
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-bg px-3 py-2 font-data text-xs text-text-main border border-border">
            POST {ingestUrl}
          </code>
          <button
            onClick={() => handleCopy(`POST ${ingestUrl}`)}
            className="shrink-0 rounded-md border border-border px-3 py-2 text-xs text-text-main hover:bg-surface transition-colors"
          >
            Copy
          </button>
        </div>

        <p className="text-xs font-medium text-text-main-muted uppercase tracking-wide pt-2">
          Example request
        </p>
        <div className="relative">
          <pre className="overflow-x-auto rounded bg-bg border border-border px-3 py-3 font-data text-xs text-text-main leading-relaxed">
            {curlExample}
          </pre>
          <button
            onClick={() => handleCopy(curlExample)}
            className="absolute right-2 top-2 rounded border border-border bg-surface px-2 py-1 text-xs text-text-main-muted hover:text-text-main transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

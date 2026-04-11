"use client";

import { useState } from "react";
import { updateTenantName } from "@/app/actions/tenant";
import { Check, Pencil, X } from "lucide-react";

interface Props {
  currentName: string;
  isOwner: boolean;
}

export function WorkspaceNameEditor({ currentName, isOwner }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) {
      setName(currentName);
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);

    const result = await updateTenantName(trimmed);

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setName(currentName);
    setEditing(false);
    setError(null);
  }

  return (
    <div>
      <label className="text-xs text-text-muted">Workspace name</label>
      <div className="mt-1.5 flex items-center gap-2">
        {editing ? (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              maxLength={100}
              autoFocus
              disabled={saving}
              className="flex-1 rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text outline-none focus:border-accent disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md p-1.5 text-accent transition-colors hover:bg-accent-muted disabled:opacity-50"
              title="Save"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg hover:text-text"
              title="Cancel"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-text">{currentName}</span>
            {isOwner && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg hover:text-text"
                title="Rename workspace"
              >
                <Pencil size={14} />
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      {!isOwner && (
        <p className="mt-1.5 text-xs text-text-muted">
          Only the workspace owner can change this name.
        </p>
      )}
    </div>
  );
}

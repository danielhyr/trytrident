"use client";

import { useState } from "react";
import { X, Search, ChevronDown, ChevronRight } from "lucide-react";
import {
  LIQUID_VARIABLES,
  getVariablesByCategory,
} from "@/lib/liquid/contact-context";

interface PersonalizationPanelProps {
  open: boolean;
  onClose: () => void;
  onInsert: (variable: string) => void;
}

export function PersonalizationPanel({
  open,
  onClose,
  onInsert,
}: PersonalizationPanelProps) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({ Contact: true, Shop: true, Campaign: true });

  if (!open) return null;

  const grouped = getVariablesByCategory();
  const filtered = search
    ? LIQUID_VARIABLES.filter(
        (v) =>
          v.label.toLowerCase().includes(search.toLowerCase()) ||
          v.key.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="absolute right-0 top-0 z-20 h-full w-72 border-l border-card-border bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-card-border p-3">
        <h3 className="font-headline text-sm font-semibold text-text-main">
          Personalization
        </h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-text-main-muted hover:bg-gray-100 hover:text-text-main"
        >
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-card-border p-3">
        <div className="flex items-center gap-2 rounded-md border border-card-border bg-input-bg px-2 py-1.5">
          <Search size={14} className="text-text-main-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search variables..."
            className="flex-1 bg-transparent text-xs text-text-main outline-none placeholder:text-text-main-muted"
          />
        </div>
      </div>

      {/* Variable list */}
      <div className="overflow-y-auto p-2" style={{ maxHeight: "calc(100% - 110px)" }}>
        {filtered ? (
          // Search results
          <div className="space-y-0.5">
            {filtered.map((v) => (
              <VariableButton key={v.key} variable={v} onInsert={onInsert} />
            ))}
            {filtered.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-text-main-muted">
                No variables match &quot;{search}&quot;
              </p>
            )}
          </div>
        ) : (
          // Categorized list
          Object.entries(grouped).map(([category, vars]) => (
            <div key={category} className="mb-1">
              <button
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-text-main-muted hover:bg-gray-50"
              >
                {expandedCategories[category] ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
                {category}
              </button>
              {expandedCategories[category] && (
                <div className="ml-1 space-y-0.5">
                  {vars.map((v) => (
                    <VariableButton
                      key={v.key}
                      variable={v}
                      onInsert={onInsert}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function VariableButton({
  variable,
  onInsert,
}: {
  variable: { key: string; label: string; example: string };
  onInsert: (variable: string) => void;
}) {
  return (
    <button
      onClick={() => onInsert(`{{ ${variable.key} }}`)}
      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-gray-50"
    >
      <div>
        <p className="text-xs font-medium text-text-main">{variable.label}</p>
        <p className="font-data text-[10px] text-text-main-muted">
          {variable.key}
        </p>
      </div>
      <span className="text-[10px] text-text-main-muted italic">
        {variable.example}
      </span>
    </button>
  );
}

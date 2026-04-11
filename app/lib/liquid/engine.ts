/**
 * LiquidJS engine — singleton with custom filters.
 *
 * Used for template rendering, validation, and variable extraction.
 */

import { Liquid } from "liquidjs";

/** Singleton Liquid engine */
let _engine: Liquid | null = null;

function getEngine(): Liquid {
  if (!_engine) {
    _engine = new Liquid({
      strictVariables: false,
      strictFilters: false,
    });

    // Custom filters
    _engine.registerFilter("money", (value: unknown) => {
      const num = Number(value);
      if (isNaN(num)) return "$0.00";
      return `$${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    });

    _engine.registerFilter("date_format", (value: unknown, format?: string) => {
      if (!value) return "";
      const date = new Date(String(value));
      if (isNaN(date.getTime())) return String(value);

      const fmt = format ?? "MMM d, yyyy";
      return formatDate(date, fmt);
    });

    _engine.registerFilter(
      "truncate_words",
      (value: unknown, count?: number) => {
        const str = String(value ?? "");
        const words = str.split(/\s+/);
        const max = count ?? 20;
        if (words.length <= max) return str;
        return words.slice(0, max).join(" ") + "...";
      }
    );

    _engine.registerFilter("default", (value: unknown, fallback?: unknown) => {
      if (value === null || value === undefined || value === "") {
        return fallback ?? "";
      }
      return value;
    });
  }
  return _engine;
}

/** Render a Liquid template string with the given context */
export async function renderLiquid(
  template: string,
  context: Record<string, unknown>
): Promise<string> {
  const engine = getEngine();
  return engine.parseAndRender(template, context);
}

/** Validate Liquid template syntax */
export async function validateLiquid(
  template: string
): Promise<{ valid: boolean; error?: string }> {
  const engine = getEngine();
  try {
    engine.parse(template);
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Invalid Liquid syntax",
    };
  }
}

/** Extract variable references from a Liquid template string */
export function extractLiquidVariables(template: string): string[] {
  const matches = template.match(/\{\{\s*([a-zA-Z_][\w.]*)\s*(?:\|[^}]*)?\}\}/g);
  if (!matches) return [];

  const vars = new Set<string>();
  for (const match of matches) {
    // Extract the variable name before any filters
    const inner = match.replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "");
    const varName = inner.split("|")[0].trim();
    if (varName) vars.add(varName);
  }
  return Array.from(vars).sort();
}

/** Simple date formatter */
function formatDate(date: Date, format: string): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return format
    .replace("yyyy", String(date.getFullYear()))
    .replace("MMM", months[date.getMonth()])
    .replace("MM", String(date.getMonth() + 1).padStart(2, "0"))
    .replace("dd", String(date.getDate()).padStart(2, "0"))
    .replace("d", String(date.getDate()));
}

"use client";

const suggestions = [
  "How many contacts do I have?",
  "Show me my segments",
  "What's my pipeline status?",
  "Create a VIP segment",
] as const;

interface ChatSuggestionsProps {
  onSelect: (prompt: string) => void;
}

export function ChatSuggestions({ onSelect }: ChatSuggestionsProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 pb-4">
      <p className="text-xs font-medium uppercase tracking-widest text-[#94A3B8]">Try one of these</p>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            className="rounded-lg border border-[#D4D9E4] bg-white/80 px-4 py-2.5 text-sm font-medium text-[#334155] shadow-sm backdrop-blur-sm transition-all hover:border-[#0ACDBC]/60 hover:bg-white hover:text-[#0ACDBC] hover:shadow-md"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

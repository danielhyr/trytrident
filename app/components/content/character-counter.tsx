"use client";

interface CharacterCounterProps {
  text: string;
  /** Single SMS segment = 160 chars */
  segmentSize?: number;
}

export function CharacterCounter({
  text,
  segmentSize = 160,
}: CharacterCounterProps) {
  const length = text.length;
  const segments = length === 0 ? 0 : Math.ceil(length / segmentSize);

  let colorClass = "text-green-600";
  if (segments > 2) colorClass = "text-red-500";
  else if (segments > 1) colorClass = "text-yellow-600";

  return (
    <div className={`flex items-center gap-2 font-data text-xs ${colorClass}`}>
      <span>
        {length} / {segmentSize} chars
      </span>
      <span className="text-text-main-muted">·</span>
      <span>
        {segments} segment{segments !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

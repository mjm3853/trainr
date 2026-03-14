"use client";

import { cn } from "@/lib/utils";

interface RpeSelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

const rpeColors: Record<number, string> = {
  1: "bg-green-500/20 text-green-400 border-green-500/30",
  2: "bg-green-500/20 text-green-400 border-green-500/30",
  3: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  4: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  5: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  6: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  7: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  8: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  9: "bg-red-500/20 text-red-400 border-red-500/30",
  10: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function RpeSelector({ value, onChange }: RpeSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">RPE (optional)</label>
        {value !== null && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange(null)}
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n === value ? null : n)}
            className={cn(
              "flex h-11 items-center justify-center rounded-lg border text-sm font-medium transition-all",
              value === n
                ? rpeColors[n]
                : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

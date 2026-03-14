"use client";

import { cn } from "@/lib/utils";

interface ActivityProgressProps {
  total: number;
  completed: number;
}

export function ActivityProgress({ total, completed }: ActivityProgressProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "size-3 rounded-full transition-colors",
            i < completed ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">
        {completed}/{total}
      </span>
    </div>
  );
}

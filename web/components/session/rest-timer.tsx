"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface RestTimerProps {
  seconds: number;
  onDismiss: () => void;
}

export function RestTimer({ seconds: initialSeconds, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      onDismiss();
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onDismiss]);

  const progress = 1 - remaining / initialSeconds;
  const degrees = progress * 360;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <p className="text-sm font-medium text-muted-foreground">Rest</p>
      <div
        className="relative flex size-32 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(oklch(0.922 0 0) ${degrees}deg, oklch(0.269 0 0) ${degrees}deg)`,
        }}
      >
        <div className="flex size-[7rem] items-center justify-center rounded-full bg-background">
          <span className="text-4xl font-bold tabular-nums">{remaining}</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onDismiss}>
        Skip rest
      </Button>
    </div>
  );
}

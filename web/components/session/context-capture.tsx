"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SessionContext, PainPoint } from "@/lib/types";

interface ContextCaptureProps {
  onComplete: (context: SessionContext) => void;
  onSkip: () => void;
}

const energyLabels = ["Exhausted", "Low", "Normal", "Good", "Great"];

export function ContextCapture({ onComplete, onSkip }: ContextCaptureProps) {
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [hasPain, setHasPain] = useState(false);
  const [painArea, setPainArea] = useState("");
  const [painSeverity, setPainSeverity] = useState<1 | 2 | 3>(1);
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState(60);
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    const painPoints: PainPoint[] = [];
    if (hasPain && painArea.trim()) {
      painPoints.push({ area: painArea.trim(), severity: painSeverity });
    }

    const context: SessionContext = {
      energyLevel: energy,
      painPoints,
      timeConstraintMinutes: hasTimeLimit ? timeMinutes : null,
      location: "",
      additionalNotes: notes,
      recordedAt: new Date().toISOString(),
    };
    onComplete(context);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Pre-Session Check-in</h2>
        <p className="text-sm text-muted-foreground">
          How are you feeling today?
        </p>
      </div>

      {/* Energy level */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Energy Level</label>
        <div className="grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as const).map((level) => (
            <button
              key={level}
              onClick={() => setEnergy(level)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium transition-colors",
                energy === level
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <span className="text-lg">{level}</span>
              <span className="text-[10px]">{energyLabels[level - 1]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pain toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Pain or Discomfort</label>
          <button
            onClick={() => setHasPain(!hasPain)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              hasPain
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground",
            )}
          >
            {hasPain ? "Yes" : "No"}
          </button>
        </div>
        {hasPain && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <input
              type="text"
              placeholder="Area (e.g., lower back)"
              value={painArea}
              onChange={(e) => setPainArea(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setPainSeverity(s)}
                  className={cn(
                    "flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors",
                    painSeverity === s
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {s === 1 ? "Mild" : s === 2 ? "Moderate" : "Severe"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Time constraint */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Time Constraint</label>
          <button
            onClick={() => setHasTimeLimit(!hasTimeLimit)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              hasTimeLimit
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {hasTimeLimit ? "Yes" : "No"}
          </button>
        </div>
        {hasTimeLimit && (
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeMinutes(Math.max(15, timeMinutes - 15))}
            >
              &minus;
            </Button>
            <div className="flex-1 text-center">
              <span className="text-2xl font-bold tabular-nums">{timeMinutes}</span>
              <span className="ml-1 text-sm text-muted-foreground">min</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeMinutes(timeMinutes + 15)}
            >
              +
            </Button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes (optional)</label>
        <Textarea
          placeholder="Anything else your coach should know?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 h-12" onClick={onSkip}>
          Skip Check-in
        </Button>
        <Button className="flex-[2] h-12 text-base font-semibold" onClick={handleSubmit}>
          Continue
        </Button>
      </div>
    </div>
  );
}

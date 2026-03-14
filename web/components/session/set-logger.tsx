"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WeightRepsInput, SingleStepper } from "./weight-reps-input";
import { ActivityProgress } from "./activity-progress";
import { RpeSelector } from "./rpe-selector";
import { RestTimer } from "./rest-timer";
import { cn } from "@/lib/utils";
import type { ActivityMetric, ActivityTarget, ActivityValue, ActivitySet } from "@/lib/types";

interface SetLoggerProps {
  activityName: string;
  metric: ActivityMetric;
  target: ActivityTarget;
  config: Record<string, unknown>;
  onComplete: (sets: ActivitySet[], rpe: number | null) => void;
}

/** Derive the weight step from activity config (roundingIncrement) or default 5. */
function getWeightStep(config: Record<string, unknown>): number {
  if (typeof config.roundingIncrement === "number") return config.roundingIncrement;
  return 5;
}

export function SetLogger({
  activityName,
  metric,
  target,
  config,
  onComplete,
}: SetLoggerProps) {
  const totalSets = target.sets ?? 1;
  const [sets, setSets] = useState<ActivitySet[]>([]);
  const [rpe, setRpe] = useState<number | null>(null);
  const [resting, setResting] = useState(false);
  const [showRpe, setShowRpe] = useState(false);

  // Current input state — initialized from target
  const [weight, setWeight] = useState(() =>
    target.planned.kind === "load_reps" ? target.planned.weight : 0,
  );
  const [reps, setReps] = useState(() =>
    target.planned.kind === "load_reps"
      ? target.planned.reps
      : target.planned.kind === "reps_only"
        ? target.planned.reps
        : 0,
  );
  const [count, setCount] = useState(() =>
    target.planned.kind === "count" ? target.planned.count : 0,
  );
  const [duration, setDuration] = useState(() =>
    target.planned.kind === "duration" ? target.planned.value : 0,
  );
  const [rating, setRating] = useState(5);
  const [completed, setCompleted] = useState(true);

  const allSetsLogged = sets.length >= totalSets;

  function buildValue(): ActivityValue {
    switch (metric.kind) {
      case "load_reps":
        return { kind: "load_reps", weight, reps, unit: metric.unit };
      case "reps_only":
        return { kind: "reps_only", reps };
      case "duration":
        return { kind: "duration", value: duration, unit: metric.unit };
      case "rating":
        return { kind: "rating", score: rating };
      case "count":
        return { kind: "count", count };
      case "completion":
        return { kind: "completion", completed };
    }
  }

  function logSet() {
    const value = buildValue();
    const newSet: ActivitySet = {
      ordinal: sets.length,
      value,
      completed: metric.kind === "completion" ? completed : true,
      note: null,
    };

    const updated = [...sets, newSet];
    setSets(updated);

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);

    if (updated.length >= totalSets) {
      setShowRpe(true);
    } else {
      setResting(true);
    }
  }

  function finishActivity() {
    onComplete(sets, rpe);
  }

  // RPE selection screen (shown after all sets logged)
  if (showRpe) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold">{activityName}</h3>
          <p className="text-sm text-muted-foreground">All {totalSets} sets completed</p>
        </div>
        <ActivityProgress total={totalSets} completed={sets.length} />
        <RpeSelector value={rpe} onChange={setRpe} />
        <Button className="h-14 w-full text-base font-semibold" onClick={finishActivity}>
          Next Exercise
        </Button>
      </div>
    );
  }

  // Rest timer screen
  if (resting) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">{activityName}</h3>
          <ActivityProgress total={totalSets} completed={sets.length} />
        </div>
        <RestTimer seconds={90} onDismiss={() => setResting(false)} />
      </div>
    );
  }

  // Main logging UI
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">{activityName}</h3>
        <p className="text-sm text-muted-foreground">
          Set {sets.length + 1} of {totalSets}
        </p>
      </div>

      <ActivityProgress total={totalSets} completed={sets.length} />

      {/* Input variant based on metric kind */}
      <div className="rounded-xl border border-border bg-card p-4">
        {metric.kind === "load_reps" && (
          <WeightRepsInput
            weight={weight}
            reps={reps}
            unit={metric.unit}
            weightStep={getWeightStep(config)}
            onWeightChange={setWeight}
            onRepsChange={setReps}
          />
        )}

        {metric.kind === "reps_only" && (
          <SingleStepper label="Reps" value={reps} onChange={setReps} />
        )}

        {metric.kind === "duration" && (
          <SingleStepper
            label="Time"
            value={duration}
            onChange={setDuration}
            unit={metric.unit}
          />
        )}

        {metric.kind === "count" && (
          <SingleStepper
            label={metric.label}
            value={count}
            onChange={setCount}
          />
        )}

        {metric.kind === "rating" && (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: metric.scale }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={cn(
                  "flex h-12 items-center justify-center rounded-lg border text-base font-medium transition-colors",
                  rating === n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {metric.kind === "completion" && (
          <button
            onClick={() => setCompleted(!completed)}
            className={cn(
              "flex h-16 w-full items-center justify-center rounded-xl border-2 text-lg font-semibold transition-all",
              completed
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {completed ? "Completed" : "Not completed"}
          </button>
        )}
      </div>

      {/* Log set button */}
      <Button
        className="h-14 w-full text-base font-semibold"
        onClick={logSet}
      >
        Log Set {sets.length + 1}
      </Button>
    </div>
  );
}

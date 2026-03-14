"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WeightRepsInput, SingleStepper } from "./weight-reps-input";
import { ActivityProgress } from "./activity-progress";
import { RpeSelector } from "./rpe-selector";
import { RestTimer } from "./rest-timer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatSetValue } from "@/lib/format";
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

/** Derive rest timer seconds from config or default 90. */
function getRestSeconds(config: Record<string, unknown>): number {
  if (typeof config.restSeconds === "number") return config.restSeconds;
  return 90;
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

  // Edit state
  const [editWeight, setEditWeight] = useState(0);
  const [editReps, setEditReps] = useState(0);
  const [editCount, setEditCount] = useState(0);
  const [editDuration, setEditDuration] = useState(0);
  const [editRating, setEditRating] = useState(5);
  const [editCompleted, setEditCompleted] = useState(true);

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

  function buildEditValue(): ActivityValue {
    switch (metric.kind) {
      case "load_reps":
        return { kind: "load_reps", weight: editWeight, reps: editReps, unit: metric.unit };
      case "reps_only":
        return { kind: "reps_only", reps: editReps };
      case "duration":
        return { kind: "duration", value: editDuration, unit: metric.unit };
      case "rating":
        return { kind: "rating", score: editRating };
      case "count":
        return { kind: "count", count: editCount };
      case "completion":
        return { kind: "completion", completed: editCompleted };
    }
  }

  function openEdit(index: number) {
    const set = sets[index];
    if (!set) return;
    const v = set.value;
    if (v.kind === "load_reps") { setEditWeight(v.weight); setEditReps(v.reps); }
    else if (v.kind === "reps_only") { setEditReps(v.reps); }
    else if (v.kind === "duration") { setEditDuration(v.value); }
    else if (v.kind === "rating") { setEditRating(v.score); }
    else if (v.kind === "count") { setEditCount(v.count); }
    else if (v.kind === "completion") { setEditCompleted(v.completed); }
    setEditingIndex(index);
  }

  function saveEdit() {
    if (editingIndex === null) return;
    const updated = [...sets];
    updated[editingIndex] = {
      ...updated[editingIndex]!,
      value: buildEditValue(),
    };
    setSets(updated);
    setEditingIndex(null);
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
      <div className="space-y-6 animate-in fade-in duration-200">
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
      <div className="space-y-4 animate-in fade-in duration-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold">{activityName}</h3>
          <ActivityProgress total={totalSets} completed={sets.length} />
        </div>
        <RestTimer seconds={getRestSeconds(config)} onDismiss={() => setResting(false)} />
      </div>
    );
  }

  // Edit sheet content
  const editSheet = (
    <SheetContent side="bottom">
      <SheetHeader>
        <SheetTitle>Edit Set {editingIndex !== null ? editingIndex + 1 : ""}</SheetTitle>
      </SheetHeader>
      <div className="space-y-4 py-4">
        {metric.kind === "load_reps" && (
          <WeightRepsInput
            weight={editWeight}
            reps={editReps}
            unit={metric.unit}
            weightStep={getWeightStep(config)}
            onWeightChange={setEditWeight}
            onRepsChange={setEditReps}
          />
        )}
        {metric.kind === "reps_only" && (
          <SingleStepper label="Reps" value={editReps} onChange={setEditReps} />
        )}
        {metric.kind === "duration" && (
          <SingleStepper label="Time" value={editDuration} onChange={setEditDuration} unit={metric.unit} />
        )}
        {metric.kind === "count" && (
          <SingleStepper label={metric.label} value={editCount} onChange={setEditCount} />
        )}
        <Button className="h-12 w-full font-semibold" onClick={saveEdit}>
          Save
        </Button>
      </div>
    </SheetContent>
  );

  // Main logging UI
  return (
    <Sheet open={editingIndex !== null} onOpenChange={(open) => { if (!open) setEditingIndex(null); }}>
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold">{activityName}</h3>
          <p className="text-sm text-muted-foreground">
            Set {sets.length + 1} of {totalSets}
          </p>
        </div>

        <ActivityProgress total={totalSets} completed={sets.length} />

        {/* Logged sets */}
        {sets.length > 0 && (
          <div className="space-y-1">
            {sets.map((set, i) => (
              <button
                key={i}
                onClick={() => openEdit(i)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <span className="text-muted-foreground">Set {i + 1}</span>
                <div className="flex items-center gap-2">
                  <span>{formatSetValue(set.value)}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3 text-muted-foreground">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}

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

      {/* Edit sheet */}
      {editSheet}
    </Sheet>
  );
}

/**
 * Client-side activity formatting — port of domains/workout/format.ts.
 */

import type { ActivityMetric, ActivityTarget, ActivityValue, ActivitySet, ActivityRecord } from "./types";

export function formatTarget(metric: ActivityMetric, target: ActivityTarget): string {
  const { planned, sets, note } = target;

  if (planned.kind === "load_reps") {
    const setsStr = sets ? `${sets} \u00d7 ` : "";
    return `${setsStr}${planned.reps} reps @ ${planned.weight} ${planned.unit}`;
  }

  if (planned.kind === "reps_only") {
    const setsStr = sets ? `${sets} \u00d7 ` : "";
    return `${setsStr}${planned.reps} reps`;
  }

  if (planned.kind === "duration") {
    return `${planned.value} ${planned.unit}`;
  }

  if (planned.kind === "rating") {
    const scale = metric.kind === "rating" ? metric.scale : 10;
    return `Rate 1\u2013${scale}`;
  }

  if (planned.kind === "count") {
    const label = metric.kind === "count" ? metric.label : "reps";
    return `${planned.count} ${label}`;
  }

  if (planned.kind === "completion") {
    return "Complete";
  }

  return "Unknown target";
}

export function formatSetValue(value: ActivityValue): string {
  if (value.kind === "load_reps") return `${value.weight} ${value.unit} \u00d7 ${value.reps}`;
  if (value.kind === "reps_only") return `${value.reps} reps`;
  if (value.kind === "duration") return `${value.value} ${value.unit}`;
  if (value.kind === "rating") return `${value.score}/10`;
  if (value.kind === "count") return `${value.count}`;
  if (value.kind === "completion") return value.completed ? "Done" : "Skipped";
  return "?";
}

export function formatActivityRecord(name: string, record: ActivityRecord): string {
  const completed = record.sets.filter((s) => s.completed);
  if (completed.length === 0) return `${name}: no sets completed`;
  const setStrs = completed.map((s) => formatSetValue(s.value));
  const rpe = record.rpe ? ` @ RPE ${record.rpe}` : "";
  return `${name}: ${setStrs.join(", ")}${rpe}`;
}

export function formatDuration(minutes: number | null): string {
  if (minutes == null) return "--";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatVolume(volume: number): string {
  return `${volume.toLocaleString("en-US")} lbs`;
}

export function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysDiff = Math.round((startOfToday.getTime() - startOfDay.getTime()) / 86_400_000);

  if (daysDiff === 0) return "Today";
  if (daysDiff === 1) return "Yesterday";
  if (daysDiff < 7) return "This Week";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

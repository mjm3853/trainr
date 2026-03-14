"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatVolume } from "@/lib/format";
import type { ActivityRecord } from "@/lib/types";

interface SessionSummaryProps {
  activities: ActivityRecord[];
  durationMinutes?: number;
}

interface Stat {
  label: string;
  value: string;
}

function computeStats(activities: ActivityRecord[], durationMinutes?: number): Stat[] {
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  let rpeSum = 0;
  let rpeCount = 0;

  for (const activity of activities) {
    if (activity.rpe) {
      rpeSum += activity.rpe;
      rpeCount++;
    }
    for (const set of activity.sets) {
      if (!set.completed) continue;
      totalSets++;
      if (set.value.kind === "load_reps") {
        totalVolume += set.value.weight * set.value.reps;
        totalReps += set.value.reps;
      } else if (set.value.kind === "reps_only") {
        totalReps += set.value.reps;
      }
    }
  }

  const stats: Stat[] = [];

  if (totalVolume > 0) {
    stats.push({ label: "Volume", value: formatVolume(totalVolume) });
  }

  stats.push({ label: "Sets", value: String(totalSets) });

  if (totalReps > 0) {
    stats.push({ label: "Reps", value: String(totalReps) });
  }

  if (rpeCount > 0) {
    stats.push({ label: "Avg RPE", value: (rpeSum / rpeCount).toFixed(1) });
  }

  if (durationMinutes) {
    stats.push({ label: "Duration", value: `${durationMinutes}m` });
  }

  return stats;
}

export function SessionSummary({ activities, durationMinutes }: SessionSummaryProps) {
  const stats = computeStats(activities, durationMinutes);

  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold tabular-nums">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

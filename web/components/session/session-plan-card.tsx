"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTarget } from "@/lib/format";
import type { PlannedActivity } from "@/lib/types";

interface SessionPlanCardProps {
  activity: PlannedActivity;
  index: number;
}

export function SessionPlanCard({ activity, index }: SessionPlanCardProps) {
  const target = activity.target;

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{activity.name}</h3>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {activity.category}
            </Badge>
          </div>
          {target && (
            <>
              <p className="mt-1 text-sm font-medium text-foreground/80">
                {formatTarget(activity.metric, target)}
              </p>
              {target.note && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {target.note}
                </p>
              )}
            </>
          )}
          {target?.sets && (
            <div className="mt-2 flex gap-1">
              {Array.from({ length: target.sets }).map((_, i) => (
                <div
                  key={i}
                  className="size-2 rounded-full bg-muted"
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

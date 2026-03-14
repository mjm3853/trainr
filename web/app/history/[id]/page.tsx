"use client";

import { useParams, useRouter } from "next/navigation";
import { useSessionDetail } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatSetValue, formatDate, formatDuration } from "@/lib/format";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session, isLoading } = useSessionDetail(id);

  if (isLoading || !session) {
    return (
      <>
        <PageHeader title="Session" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={session.templateId}
        action={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Back
          </Button>
        }
      />
      <div className="space-y-4 p-4">
        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{formatDate(session.completedAt)}</span>
          {session.durationMinutes && (
            <>
              <span>&middot;</span>
              <span>{formatDuration(session.durationMinutes)}</span>
            </>
          )}
          {session.skipped && (
            <Badge variant="secondary">Skipped</Badge>
          )}
        </div>

        {session.skipReason && (
          <p className="text-sm text-muted-foreground italic">
            {session.skipReason}
          </p>
        )}

        {/* Context */}
        {session.context && (
          <Card>
            <CardContent className="space-y-1 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Energy:</span>
                <span className="font-medium">
                  {"*".repeat(session.context.energyLevel)}{" "}
                  ({session.context.energyLevel}/5)
                </span>
              </div>
              {session.context.painPoints.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Pain:</span>
                  <span>
                    {session.context.painPoints
                      .map((p) => `${p.area} (${p.severity}/3)`)
                      .join(", ")}
                  </span>
                </div>
              )}
              {session.context.timeConstraintMinutes && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Time limit:</span>
                  <span>{session.context.timeConstraintMinutes} min</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Activities */}
        {session.activities.map((record, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{record.templateId}</span>
                {record.rpe && (
                  <span className="text-xs text-muted-foreground">
                    RPE {record.rpe}
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {record.sets.map((set, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-12 text-xs text-muted-foreground">
                      Set {set.ordinal + 1}
                    </span>
                    <span className={set.completed ? "" : "text-muted-foreground line-through"}>
                      {formatSetValue(set.value)}
                    </span>
                  </div>
                ))}
              </div>
              {record.aiAdjusted && record.adjustmentReason && (
                <p className="mt-2 text-xs text-primary/80">
                  AI adjusted: {record.adjustmentReason}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Coaching notes */}
        {session.notes.length > 0 && (
          <>
            <Separator />
            {session.notes.map((note) => (
              <Card key={note.id} className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="mb-1 text-xs font-medium text-primary">
                    Coach ({note.phase}-session)
                  </div>
                  <p className="text-sm">{note.content}</p>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {/* User notes */}
        {session.userNotes && (
          <>
            <Separator />
            <div className="text-sm">
              <span className="text-muted-foreground">Notes: </span>
              {session.userNotes}
            </div>
          </>
        )}
      </div>
    </>
  );
}

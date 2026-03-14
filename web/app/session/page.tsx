"use client";

import Link from "next/link";
import { useNextSession, useSkipSession } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { SessionPlanCard } from "@/components/session/session-plan-card";
import { CoachingNoteCard } from "@/components/session/coaching-note-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function SessionPage() {
  const { data: plan, isLoading, error } = useNextSession();
  const skipMutation = useSkipSession();

  if (isLoading) {
    return (
      <>
        <PageHeader title="Today's Session" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="trainr" />
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-8 text-muted-foreground">
              <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
              <path d="M12 2v4" /><path d="M12 18v4" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">No Active Program</h2>
          <p className="text-sm text-muted-foreground">
            Create a program using the CLI to get started.
          </p>
          <pre className="rounded-md bg-muted px-3 py-2 text-xs font-mono">
            trainr program new
          </pre>
        </div>
      </>
    );
  }

  if (!plan) return null;

  return (
    <>
      <PageHeader title={plan.programName} subtitle={plan.position} />

      <div className="space-y-3 p-4">
        {/* Session label */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{plan.session.label}</h2>
            <p className="text-xs text-muted-foreground">
              ~{plan.session.estimatedMinutes} min &middot;{" "}
              {plan.session.activities.length} exercises
            </p>
          </div>
        </div>

        {/* Coaching note */}
        {plan.coachingNote && <CoachingNoteCard note={plan.coachingNote} />}

        {/* Session notes */}
        {plan.session.notes && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              {plan.session.notes}
            </CardContent>
          </Card>
        )}

        {/* Activity list */}
        {plan.session.activities.map((activity, i) => (
          <SessionPlanCard key={activity.id} activity={activity} index={i} />
        ))}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => {
              if (confirm("Skip today's session?")) {
                skipMutation.mutate({ programId: plan.programId });
              }
            }}
            disabled={skipMutation.isPending}
          >
            Skip
          </Button>
          <Link
            href={`/session/active?programId=${plan.programId}`}
            className="flex flex-[2] h-12 items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Start Session
          </Link>
        </div>
      </div>
    </>
  );
}

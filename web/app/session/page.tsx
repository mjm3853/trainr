"use client";

import { useState } from "react";
import Link from "next/link";
import { useNextSession, useSkipSession } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { SessionPlanCard } from "@/components/session/session-plan-card";
import { CoachingNoteCard } from "@/components/session/coaching-note-card";
import { ContextCapture } from "@/components/session/context-capture";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { SessionContext } from "@/lib/types";

const CONTEXT_KEY = "trainr_session_context";

export default function SessionPage() {
  const { data: plan, isLoading, error } = useNextSession();
  const skipMutation = useSkipSession();
  const [skipReason, setSkipReason] = useState("");
  const [showContext, setShowContext] = useState(false);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Today's Session" />
        <div className="space-y-3 p-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="trainr" />
        <div className="p-4">
          <EmptyState
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-8 text-muted-foreground">
                <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
                <path d="M12 2v4" /><path d="M12 18v4" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
            title="No Active Program"
            description="Create a program using the CLI to get started."
            action={
              <pre className="rounded-md bg-muted px-3 py-2 text-xs font-mono">
                trainr program new
              </pre>
            }
          />
        </div>
      </>
    );
  }

  if (!plan) return null;

  // Context capture screen
  if (showContext) {
    const pid = plan.programId;

    function handleContextComplete(context: SessionContext) {
      localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
      window.location.href = `/session/active?programId=${pid}`;
    }

    function handleContextSkip() {
      localStorage.removeItem(CONTEXT_KEY);
      window.location.href = `/session/active?programId=${pid}`;
    }

    return (
      <>
        <PageHeader title={plan.session.label} subtitle="Pre-Session" />
        <div className="p-4">
          <ContextCapture
            onComplete={handleContextComplete}
            onSkip={handleContextSkip}
          />
        </div>
      </>
    );
  }

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
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  disabled={skipMutation.isPending}
                />
              }
            >
              Skip
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Skip today&apos;s session?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will advance to the next session in your program.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="px-0">
                <Textarea
                  placeholder="Reason (optional)"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  rows={2}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    skipMutation.mutate({
                      programId: plan.programId,
                      reason: skipReason || undefined,
                    });
                  }}
                >
                  Skip Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            className="flex-[2] h-12 text-base font-semibold"
            onClick={() => setShowContext(true)}
          >
            Start Session
          </Button>
        </div>
      </div>
    </>
  );
}

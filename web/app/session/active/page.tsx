"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useNextSession, useLogSession } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { SetLogger } from "@/components/session/set-logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSetValue, formatDuration } from "@/lib/format";
import type { ActivitySet, ActivityRecord, PlannedActivity } from "@/lib/types";

const DRAFT_KEY = "trainr_active_session";

interface ActivityResult {
  activity: PlannedActivity;
  sets: ActivitySet[];
  rpe: number | null;
}

interface SessionDraft {
  programId: string;
  activityIndex: number;
  results: ActivityResult[];
  startedAt: string;
}

function ActiveSessionInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const programId = searchParams.get("programId") ?? undefined;

  const { data: plan, isLoading } = useNextSession(programId);
  const logMutation = useLogSession();

  const [activityIndex, setActivityIndex] = useState(0);
  const [results, setResults] = useState<ActivityResult[]>([]);
  const [userNotes, setUserNotes] = useState("");
  const startedAt = useRef(new Date());

  // Restore draft from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft: SessionDraft = JSON.parse(raw);
      if (draft.programId === programId && draft.results.length > 0) {
        setActivityIndex(draft.activityIndex);
        setResults(draft.results);
        startedAt.current = new Date(draft.startedAt);
      }
    } catch {
      // ignore corrupt draft
    }
  }, [programId]);

  // Save draft on every change
  useEffect(() => {
    if (!programId || results.length === 0) return;
    const draft: SessionDraft = {
      programId,
      activityIndex,
      results,
      startedAt: startedAt.current.toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [programId, activityIndex, results]);

  const handleActivityComplete = useCallback(
    (sets: ActivitySet[], rpe: number | null) => {
      if (!plan) return;
      const activity = plan.session.activities[activityIndex];
      const newResults = [...results, { activity, sets, rpe }];
      setResults(newResults);
      setActivityIndex(activityIndex + 1);
    },
    [plan, activityIndex, results],
  );

  async function submitSession() {
    if (!plan) return;

    const activities: ActivityRecord[] = results.map((r) => ({
      templateId: r.activity.id,
      target: r.activity.target!,
      sets: r.sets,
      rpe: r.rpe,
      aiAdjusted: false,
      adjustmentReason: null,
    }));

    const elapsed = Math.max(
      1,
      Math.round((Date.now() - startedAt.current.getTime()) / 60_000),
    );

    await logMutation.mutateAsync({
      programId: plan.programId,
      activities,
      durationMinutes: elapsed,
      userNotes: userNotes || undefined,
    });

    localStorage.removeItem(DRAFT_KEY);
    router.push("/session");
  }

  if (isLoading || !plan) {
    return (
      <>
        <PageHeader title="Loading..." />
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  const activities = plan.session.activities;
  const isComplete = activityIndex >= activities.length;

  // ─── Summary Screen ──────────────────────────────────────────────────────
  if (isComplete) {
    const elapsed = Math.round(
      (Date.now() - startedAt.current.getTime()) / 60_000,
    );

    return (
      <>
        <PageHeader title="Session Complete" />
        <div className="space-y-4 p-4">
          <div className="text-center">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="size-8 text-primary">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">Nice work!</h2>
            <p className="text-sm text-muted-foreground">
              {results.length} exercises &middot; {formatDuration(elapsed)}
            </p>
          </div>

          {/* Results summary */}
          {results.map((r, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.activity.name}</span>
                  {r.rpe && (
                    <span className="text-xs text-muted-foreground">
                      RPE {r.rpe}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {r.sets
                    .filter((s) => s.completed)
                    .map((s, j) => (
                      <span
                        key={j}
                        className="rounded bg-muted px-2 py-0.5 text-xs"
                      >
                        {formatSetValue(s.value)}
                      </span>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Notes */}
          <textarea
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Any notes about this session?"
            rows={3}
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
          />

          <Button
            className="h-14 w-full text-base font-semibold"
            onClick={submitSession}
            disabled={logMutation.isPending}
          >
            {logMutation.isPending ? "Saving..." : "Save Session"}
          </Button>
        </div>
      </>
    );
  }

  // ─── Active Logging ────────────────────────────────────────────────────────
  const currentActivity = activities[activityIndex];

  return (
    <>
      <PageHeader
        title={plan.session.label}
        subtitle={`Exercise ${activityIndex + 1} of ${activities.length}`}
      />

      {/* Top progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{
            width: `${(activityIndex / activities.length) * 100}%`,
          }}
        />
      </div>

      <div className="p-4">
        {currentActivity.target ? (
          <SetLogger
            key={activityIndex}
            activityName={currentActivity.name}
            metric={currentActivity.metric}
            target={currentActivity.target}
            config={currentActivity.config}
            onComplete={handleActivityComplete}
          />
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No target for this activity.
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => handleActivityComplete([], null)}
            >
              Skip
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export default function ActiveSessionPage() {
  return (
    <Suspense fallback={
      <>
        <PageHeader title="Loading..." />
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    }>
      <ActiveSessionInner />
    </Suspense>
  );
}

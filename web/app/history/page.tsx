"use client";

import { useState } from "react";
import { useActivePrograms, useSessionHistory } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { SessionListItem } from "@/components/history/session-list-item";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatRelativeDate } from "@/lib/format";
import type { HistorySession } from "@/lib/types";

/** Group sessions by relative date. */
function groupByDate(sessions: HistorySession[]): [string, HistorySession[]][] {
  const groups = new Map<string, HistorySession[]>();
  for (const session of sessions) {
    const key = session.completedAt ? formatRelativeDate(session.completedAt) : "Unknown";
    const existing = groups.get(key);
    if (existing) {
      existing.push(session);
    } else {
      groups.set(key, [session]);
    }
  }
  return Array.from(groups.entries());
}

export default function HistoryPage() {
  const { data: programs } = useActivePrograms();
  const hasMultiplePrograms = (programs?.length ?? 0) > 1;
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  const programId = selectedProgram ?? programs?.[0]?.id ?? "";
  const { data: sessions, isLoading } = useSessionHistory(programId);

  if (isLoading || !sessions) {
    return (
      <>
        <PageHeader title="History" />
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="size-4" />
            </div>
          ))}
        </div>
      </>
    );
  }

  const dateGroups = groupByDate(sessions);

  return (
    <>
      <PageHeader title="History" subtitle={`${sessions.length} sessions`} />
      <div className="space-y-2 p-4">
        {/* Program selector tabs */}
        {hasMultiplePrograms && programs && (
          <Tabs
            value={programId}
            onValueChange={(v) => setSelectedProgram(v as string)}
          >
            <TabsList className="w-full">
              {programs.map((p) => (
                <TabsTrigger key={p.id} value={p.id}>
                  {p.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {/* Content rendered below, outside tabs */}
            {programs.map((p) => (
              <TabsContent key={p.id} value={p.id} />
            ))}
          </Tabs>
        )}

        {sessions.length === 0 ? (
          <EmptyState
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-8 text-muted-foreground">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
            title="No Sessions Yet"
            description="Complete your first workout to see it here."
          />
        ) : (
          dateGroups.map(([dateLabel, groupSessions]) => (
            <div key={dateLabel} className="space-y-2">
              <h3 className="px-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {dateLabel}
              </h3>
              {groupSessions.map((session) => (
                <SessionListItem key={session.id} session={session} />
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}

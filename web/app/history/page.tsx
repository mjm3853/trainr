"use client";

import { useActivePrograms, useSessionHistory } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { SessionListItem } from "@/components/history/session-list-item";
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryPage() {
  const { data: programs } = useActivePrograms();
  const programId = programs?.[0]?.id ?? "";
  const { data: sessions, isLoading } = useSessionHistory(programId);

  if (isLoading || !sessions) {
    return (
      <>
        <PageHeader title="History" />
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="History" subtitle={`${sessions.length} sessions`} />
      <div className="space-y-2 p-4">
        {sessions.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No sessions logged yet. Complete your first workout to see it here.
          </div>
        ) : (
          sessions.map((session) => (
            <SessionListItem key={session.id} session={session} />
          ))
        )}
      </div>
    </>
  );
}

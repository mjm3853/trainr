"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDuration } from "@/lib/format";
import type { HistorySession } from "@/lib/types";

interface SessionListItemProps {
  session: HistorySession;
}

export function SessionListItem({ session }: SessionListItemProps) {
  return (
    <Link href={`/history/${session.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">
                {session.label ?? session.templateId}
              </span>
              {session.skipped && (
                <Badge variant="secondary" className="text-[10px]">
                  Skipped
                </Badge>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatDate(session.completedAt)}</span>
              {!session.skipped && (
                <>
                  <span>&middot;</span>
                  <span>{session.activityCount} exercises</span>
                  <span>&middot;</span>
                  <span>{formatDuration(session.durationMinutes)}</span>
                </>
              )}
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-muted-foreground">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </CardContent>
      </Card>
    </Link>
  );
}

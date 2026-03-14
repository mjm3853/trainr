"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { CoachingNote } from "@/lib/types";

interface CoachingNoteCardProps {
  note: CoachingNote;
}

export function CoachingNoteCard({ note }: CoachingNoteCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          AI Coach
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          {note.content}
        </p>
        {note.adjustments.length > 0 && (
          <div className="mt-3 space-y-1">
            {note.adjustments.map((adj, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                <span className="font-medium">{adj.field}:</span> {adj.rationale}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

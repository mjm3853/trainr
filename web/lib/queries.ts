/**
 * TanStack Query hooks for the trainr API.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import type {
  PlannedSessionResponse,
  ProgramSummary,
  HistorySession,
  SessionDetail,
  ActivityRecord,
  SessionContext,
} from "./types";

// ─── Programs ────────────────────────────────────────────────────────────────

export function useActivePrograms() {
  return useQuery({
    queryKey: ["programs"],
    queryFn: () => api.get<{ programs: ProgramSummary[] }>("/api/programs"),
    select: (data) => data.programs,
    staleTime: 60_000,
  });
}

// ─── Session Planning ────────────────────────────────────────────────────────

export function useNextSession(programId?: string) {
  const qs = programId ? `?programId=${programId}` : "";
  return useQuery({
    queryKey: ["session", "next", programId],
    queryFn: () => api.get<PlannedSessionResponse>(`/api/sessions/next${qs}`),
    staleTime: 30_000,
  });
}

// ─── Session Mutations ───────────────────────────────────────────────────────

interface LogSessionInput {
  programId?: string;
  activities: ActivityRecord[];
  durationMinutes?: number;
  context?: SessionContext;
  userNotes?: string;
}

export function useLogSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogSessionInput) =>
      api.post<{ sessionId: string; programComplete: boolean }>(
        "/api/sessions/log",
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", "next"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useSkipSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { programId?: string; reason?: string }) =>
      api.post<{ sessionId: string; skipped: boolean }>(
        "/api/sessions/skip",
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", "next"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

// ─── History ─────────────────────────────────────────────────────────────────

export function useSessionHistory(programId: string, limit = 20) {
  return useQuery({
    queryKey: ["history", programId, limit],
    queryFn: () =>
      api.get<{ sessions: HistorySession[] }>(
        `/api/programs/${programId}/history?limit=${limit}`,
      ),
    select: (data) => data.sessions,
    enabled: !!programId,
    staleTime: 30_000,
  });
}

export function useSessionDetail(id: string) {
  return useQuery({
    queryKey: ["session", id],
    queryFn: () => api.get<SessionDetail>(`/api/sessions/${id}`),
    enabled: !!id,
  });
}

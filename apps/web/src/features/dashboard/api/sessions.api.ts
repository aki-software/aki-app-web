import { apiClient } from "../../../api/client";
import { getStoredToken } from "../../../utils/storage";
import type { 
  SessionApi, 
  SessionData, 
  SessionDetailData, 
  SessionMetrics,
  TriageResponse,
  BehavioralTrends,
} from "@akit/contracts";

export type { 
  SessionApi, 
  SessionData, 
  SessionDetailData, 
  SessionMetrics 
};

export async function fetchSessionsList(): Promise<SessionData[]> {
  const responseData = await apiClient.get<{ data: SessionApi[] }>("/sessions?limit=1000");
  const sessions = responseData.data || [];
  return sessions.map((session) => normalizeSession(session));
}

export async function fetchSessionDetail(
  id: string,
): Promise<SessionDetailData | null> {
  try {
    const session = await apiClient.get<SessionApi>(`/sessions/${id}`);
    const metrics = await apiClient.get<SessionMetrics>(`/sessions/${id}/metrics`).catch(() => undefined);
    return normalizeSessionDetail({ ...session, metrics });
  } catch (error) {
    console.error("Error fetching session detail:", error);
    return null;
  }
}

export async function fetchTriageSessions(
  params: { page?: number; limit?: number } = {},
): Promise<TriageResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  try {
    return await apiClient.get<TriageResponse>(
      `/sessions/triage?page=${page}&limit=${limit}`,
    );
  } catch (error) {
    console.error("Error fetching triage sessions:", error);
    return {
      data: [],
      meta: { total: 0, page, limit, flaggedCount: 0 },
    };
  }
}

export async function fetchBehavioralTrends(
  params: {
    scope: "institution" | "global";
    id?: string;
    period?: number;
    from?: string;
    to?: string;
  },
): Promise<BehavioralTrends | null> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set("scope", params.scope);
    if (params.id) queryParams.set("id", params.id);
    if (params.period) queryParams.set("period", String(params.period));
    if (params.from) queryParams.set("from", params.from);
    if (params.to) queryParams.set("to", params.to);

    return await apiClient.get<BehavioralTrends>(
      `/sessions/metrics/aggregate?${queryParams.toString()}`,
    );
  } catch (error) {
    console.error("Error fetching behavioral trends:", error);
    return null;
  }
}

export async function fetchVoucherSessions(
  voucherId: string,
): Promise<SessionData[]> {
  const sessions = await apiClient.get<(SessionApi & { metrics?: SessionMetrics })[]>(
    `/sessions/voucher/${voucherId}/sessions`,
  );
  return sessions.map((session) => normalizeSession(session));
}

function normalizeSession(session: SessionApi): SessionData {
  const results = Array.isArray(session.results) ? session.results : [];
  const topResults = [...results].sort((a, b) => {
    const a2 = a as { rawScore?: number; weightedScore?: number };
    const b2 = b as { rawScore?: number; weightedScore?: number };
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    if ((b2.rawScore ?? -1) !== (a2.rawScore ?? -1)) return (b2.rawScore ?? -1) - (a2.rawScore ?? -1);
    if ((b2.weightedScore ?? 0) !== (a2.weightedScore ?? 0)) return (b2.weightedScore ?? 0) - (a2.weightedScore ?? 0);
    return a.categoryId.localeCompare(b.categoryId);
  });
  const hollandCode = topResults
    .slice(0, 3)
    .map((r) => r.categoryId.charAt(0).toUpperCase())
    .join("");

  return {
    id: session.id,
    patientName: session.patientName,
    hollandCode: hollandCode || "N/A",
    sessionDate: session.createdAt || new Date(0).toISOString(),
    totalTimeMs: Number(session.totalTimeMs) || 0,
    paymentStatus: session.paymentStatus || "UNKNOWN",
    institutionName: session.institution?.name ?? null,
    therapistName: session.therapist?.name ?? null,
    voucherCode: session.voucher?.code ?? null,
    reportUnlockedAt: session.reportUnlockedAt ?? null,
    results: results,
  };
}

function normalizeSessionDetail(
  session: SessionApi & { metrics?: SessionMetrics },
): SessionDetailData {
  return {
    ...normalizeSession(session),
    swipes: Array.isArray(session.swipes) ? session.swipes : [],
    reportUrl: null,
    metrics: session.metrics,
  };
}
import { API_URL } from "../../../api/client";

export async function downloadSessionPdf(sessionId: string): Promise<Blob> {
  const token = getStoredToken();
  const response = await fetch(
    `${API_URL}/sessions/${sessionId}/report/pdf`,
    { headers: { Authorization: `Bearer ${token}` } } 
  );

  if (!response.ok) throw new Error('Failed to download PDF');
  return response.blob();
}
// Note: downloadSessionPdf still uses fetch because apiClient is optimized for JSON.
// In a real refactor, we would add blob support to apiClient.

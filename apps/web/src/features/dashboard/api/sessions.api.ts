import { apiClient } from "../../../api/client";
import type { 
  SessionApi, 
  SessionData, 
  SessionDetailData, 
  SessionMetrics 
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
  const topResults = [...results].sort((a, b) => b.percentage - a.percentage);
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
    swipes: [], // Swipes are currently not returned by the direct session endpoint
    reportUrl: null,
    metrics: session.metrics,
  };
}
import { API_URL } from "../../../api/client";

export async function downloadSessionPdf(sessionId: string): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/sessions/${sessionId}/report/pdf`,
    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } } 
  );

  if (!response.ok) throw new Error('Failed to download PDF');
  return response.blob();
}
// Note: downloadSessionPdf still uses fetch because apiClient is optimized for JSON.
// In a real refactor, we would add blob support to apiClient.

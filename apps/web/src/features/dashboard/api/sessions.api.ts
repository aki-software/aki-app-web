import { API_URL, getAuthHeaders } from "./client";
export { SessionPaymentStatus } from "@akit/contracts";
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
  try {
    const response = await fetch(`${API_URL}/sessions`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch API data");
    const responseData = await response.json();
    const sessions: SessionApi[] = responseData.data || [];

    return sessions.map((session) => {
      const topResults = [...(session.results || [])]
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3);

      const hollandCode = topResults
        .map((result) => result.categoryId.charAt(0).toUpperCase())
        .join("");

      return {
        id: session.id,
        patientName: session.patientName,
        hollandCode: hollandCode || "N/A",
        sessionDate: session.createdAt || new Date(),
        totalTimeMs: Number(session.totalTimeMs || 0),
        paymentStatus: session.paymentStatus || "UNKNOWN",
        institutionName: session.institution?.name ?? null,
        therapistName: session.therapist?.name ?? null,
        voucherCode: session.voucher?.code ?? null,
        reportUnlockedAt: session.reportUnlockedAt ?? null,
        results: session.results,
      };
    });
  } catch (error) {
    console.error("Error fetching sessions list:", error);
    return [];
  }
}

export async function fetchSessionDetail(
  sessionId: string,
): Promise<SessionDetailData | null> {
  try {
    const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch session detail");
    const session = (await response.json()) as SessionApi & {
      swipes?: { cardId: string; categoryId: string; isLiked: boolean }[];
      reportUrl?: string | null;
      reportUnlockedAt?: string | null;
      metrics?: SessionMetrics;
    };

    const topResults = [...(session.results || [])]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);
    const hollandCode = topResults
      .map((r) => r.categoryId.charAt(0).toUpperCase())
      .join("");

    return {
      id: session.id,
      patientName: session.patientName,
      hollandCode: hollandCode || "N/A",
      sessionDate: session.createdAt || new Date(),
      totalTimeMs: Number(session.totalTimeMs || 0),
      paymentStatus: session.paymentStatus || "UNKNOWN",
      institutionName: session.institution?.name ?? null,
      therapistName: session.therapist?.name ?? null,
      voucherCode: session.voucher?.code ?? null,
      reportUnlockedAt: session.reportUnlockedAt ?? null,
      results: session.results,
      swipes: session.swipes,
      reportUrl: session.reportUrl ?? null,
      metrics: session.metrics,
    };
  } catch (error) {
    console.error("Error fetching session detail:", error);
    return null;
  }
}

export async function fetchVoucherSessions(
  voucherId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    minDuration?: number;
    maxDuration?: number;
  },
): Promise<SessionData[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.minDuration) params.append('minDuration', filters.minDuration.toString());
    if (filters?.maxDuration) params.append('maxDuration', filters.maxDuration.toString());

    const response = await fetch(
      `${API_URL}/sessions/voucher/${voucherId}/sessions${params.toString() ? `?${params.toString()}` : ''}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch voucher sessions');
    
    const sessions = (await response.json()) as (SessionApi & { metrics?: SessionMetrics })[];
    
    return sessions.map((session) => {
      const topResults = [...(session.results || [])]
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3);
      const hollandCode = topResults
        .map((result) => result.categoryId.charAt(0).toUpperCase())
        .join("");

      return {
        id: session.id,
        patientName: session.patientName,
        hollandCode: hollandCode || "N/A",
        sessionDate: session.createdAt || new Date(),
        totalTimeMs: Number(session.totalTimeMs || 0),
        paymentStatus: session.paymentStatus || "UNKNOWN",
        institutionName: session.institution?.name ?? null,
        therapistName: session.therapist?.name ?? null,
        voucherCode: session.voucher?.code ?? null,
        reportUnlockedAt: session.reportUnlockedAt ?? null,
        results: session.results,
        metrics: session.metrics,
      };
    });
  } catch (error) {
    console.error('Error fetching voucher sessions:', error);
    return [];
  }
}

export async function downloadSessionPdf(sessionId: string): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/sessions/${sessionId}/report/pdf`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error('Failed to download PDF');
  return response.blob();
}

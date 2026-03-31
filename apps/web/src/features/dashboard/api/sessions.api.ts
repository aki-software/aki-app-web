import { API_URL, getAuthHeaders } from "./client";

export type SessionResultApi = {
  categoryId: string;
  percentage: number;
};

export type SessionApi = {
  id: string;
  patientName: string;
  createdAt?: string | Date | number;
  totalTimeMs?: string | number;
  paymentStatus?: string;
  results?: SessionResultApi[];
  institution?: { name?: string | null } | null;
  therapist?: { name?: string | null } | null;
  voucher?: { code?: string | null } | null;
};

export interface SessionData {
  id: string;
  patientName: string;
  hollandCode: string;
  sessionDate: string | Date | number;
  totalTimeMs: number;
  paymentStatus: string;
  institutionName: string | null;
  therapistName: string | null;
  voucherCode: string | null;
  results?: { categoryId: string; percentage: number }[];
}

export interface SessionDetailData extends SessionData {
  swipes?: { 
    cardId: string; 
    categoryId: string; 
    isLiked: boolean;
    timestamp?: string | Date;
  }[];
  reportUrl?: string | null;
  reportUnlockedAt?: string | null;
}

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
        results: session.results,
      };
    });
  } catch (error) {
    console.error("Error fetching sessions list:", error);
    return [];
  }
}

export async function fetchSessionDetail(
  sessionId: string
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
      results: session.results,
      swipes: session.swipes,
      reportUrl: session.reportUrl ?? null,
      reportUnlockedAt: session.reportUnlockedAt ?? null,
    };
  } catch (error) {
    console.error("Error fetching session detail:", error);
    return null;
  }
}

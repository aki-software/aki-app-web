import { describe, expect, it } from "vitest";
import { reportGenerationJobSchema, reportStateSchema } from "../reports";

describe("report contracts", () => {
  it("serializes a ready report state with immutable delivery metadata", () => {
    expect(
      reportStateSchema.safeParse({
        status: "AVAILABLE",
        version: 1,
        generatedAt: "2026-08-11T12:00:00.000Z",
        availableUntil: "2027-08-11T12:00:00.000Z",
        deliveryReady: true,
      }).success,
    ).toBe(true);
  });

  it("rejects unknown report lifecycle statuses", () => {
    expect(reportStateSchema.safeParse({ status: "PUBLIC" }).success).toBe(
      false,
    );
  });

  it("rejects delivery readiness without an available immutable report", () => {
    for (const state of [
      { status: "PENDING", deliveryReady: true },
      { status: "AVAILABLE", deliveryReady: true, version: 0 },
      { status: "AVAILABLE", deliveryReady: true, version: 1 },
    ]) {
      expect(reportStateSchema.safeParse(state).success).toBe(false);
    }
  });

  it("requires a versioned report generation job", () => {
    expect(
      reportGenerationJobSchema.safeParse({
        reportId: "123e4567-e89b-12d3-a456-426614174000",
        sessionId: "123e4567-e89b-12d3-a456-426614174001",
        version: 1,
      }).success,
    ).toBe(true);
    expect(reportGenerationJobSchema.safeParse({ version: 0 }).success).toBe(
      false,
    );
  });
});

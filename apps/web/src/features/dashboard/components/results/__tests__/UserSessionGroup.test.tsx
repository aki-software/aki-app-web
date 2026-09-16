import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserSessionGroup } from "../UserSessionGroup";

vi.mock("../../../../api/dashboard", () => ({
  SessionPaymentStatus: {
    PAID: "PAID",
    VOUCHER_REDEEMED: "VOUCHER_REDEEMED",
    PENDING: "PENDING",
  },
}));

describe("UserSessionGroup", () => {
  it("shows the selected participant name and authenticated email separately", () => {
    render(
      <UserSessionGroup
        userName="Nombre elegido para el test"
        patientEmail="cuenta-larga@example.com"
        userSessions={[
          {
            id: "session-1",
            patientName: "Nombre elegido para el test",
            patientEmail: "cuenta-larga@example.com",
            hollandCode: "RIA",
            sessionDate: "2026-09-16T12:00:00.000Z",
            totalTimeMs: 120000,
            paymentStatus: "PAID",
            institutionName: null,
            therapistName: null,
            voucherCode: null,
            results: [],
          },
        ]}
        isExpanded={false}
        onToggle={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    expect(screen.getByText("Nombre elegido para el test")).toBeInTheDocument();
    expect(screen.getByText("cuenta-larga@example.com")).toBeInTheDocument();
  });
});

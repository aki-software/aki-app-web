import { describe, expect, it } from "vitest";
import type { VoucherData } from "../api/dashboard";
import { buildVoucherShareMessage } from "./useVoucherActions";

const voucher = (overrides: Partial<VoucherData> = {}): VoucherData =>
  ({
    id: "11111111-1111-1111-1111-111111111111",
    batchId: "22222222-2222-2222-2222-222222222222",
    code: "ABCD1234",
    status: "AVAILABLE",
    ownerType: "INSTITUTION",
    ownerInstitutionId: "33333333-3333-3333-3333-333333333333",
    ownerInstitutionName: "Colegio Horizonte",
    ownerUserId: null,
    createdAt: "2026-10-22T00:00:00.000Z",
    redeemedAt: null,
    expiresAt: "2026-12-31T00:00:00.000Z",
    assignedPatientName: "Ana",
    ...overrides,
  }) as VoucherData;

describe("buildVoucherShareMessage", () => {
  it("builds a ready-to-send message with recipient, institution, code, and expiry", () => {
    expect(buildVoucherShareMessage(voucher())).toBe(
      "Hola Ana,\n\nColegio Horizonte te compartió un voucher para realizar tu orientación vocacional en A.kit.\n\nCódigo de acceso: ABCD-1234\nVence: 31/12/2026\n\nIngresá a A.kit y cargá este código para comenzar.",
    );
  });

  it("uses neutral copy when recipient or expiry is unavailable", () => {
    expect(
      buildVoucherShareMessage(
        voucher({
          assignedPatientName: null,
          expiresAt: null,
          ownerInstitutionName: undefined,
        }),
      ),
    ).toContain("A.kit te compartió un voucher");
  });
});

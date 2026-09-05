import { expect, test } from "@playwright/test";
import {
  auditLayout,
  installAuditDiagnostics,
  installAuditStorage,
  isolateNetwork,
} from "./route-audit.helpers";
import {
  type AuditRole,
  type AuditTheme,
} from "./route-audit.fixtures";

const viewports = [360, 390, 768, 1024, 1440] as const;
const themes: readonly AuditTheme[] = ["light", "dark"];
const roles: readonly AuditRole[] = ["admin", "institution"];

for (const role of roles) {
  for (const theme of themes) {
    for (const width of viewports) {
      test(`${role} overview at ${width}px in ${theme} theme`, async ({ page }) => {
        const unexpectedCalls: string[] = [];

        installAuditDiagnostics(page, unexpectedCalls);
        await installAuditStorage(page, role, theme);
        await isolateNetwork(page, role, unexpectedCalls);
        await page.setViewportSize({ width, height: 900 });

        await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(
          page.getByText(
            role === "admin" ? "Centro de operación" : "Resumen de vouchers",
          ),
        ).toBeVisible();

        await auditLayout(page, `${role}-${theme}-${width}w`, unexpectedCalls);
      });
    }
  }
}

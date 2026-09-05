import { expect, test, type Page } from "@playwright/test";
import {
  auditLayout,
  installAuditDiagnostics,
  installAuditStorage,
  isolateNetwork,
} from "./route-audit.helpers";
import { ids, type AuditRole, type AuditTheme } from "./route-audit.fixtures";

type RouteCase = { name: string; path: string; role: AuditRole };
const sessionPath = `/dashboard/sessions/${ids.session}`;
const institutionPath = `/dashboard/institutions/${ids.institution}`;

const baseline: RouteCase[] = [
  ...[
    "dashboard",
    "results",
    "vouchers",
    "settings",
    "activity",
    "billing",
  ].flatMap((name) =>
    ["admin", "institution", "therapist"].map((role) => ({
      name,
      role: role as AuditRole,
      path: name === "dashboard" ? "/dashboard" : `/dashboard/${name}`,
    })),
  ),
  { name: "session-detail", path: sessionPath, role: "admin" },
  { name: "session-detail", path: sessionPath, role: "institution" },
  { name: "session-detail", path: sessionPath, role: "therapist" },
  { name: "users-institutions", path: "/dashboard/users", role: "admin" },
  {
    name: "users-professionals",
    path: "/dashboard/users?tab=professionals",
    role: "admin",
  },
  { name: "institution-detail", path: institutionPath, role: "admin" },
  { name: "pricing-plans", path: "/dashboard/pricing-plans", role: "admin" },
  { name: "payment-ledger", path: "/dashboard/payment-ledger", role: "admin" },
];
const riskRoutes: RouteCase[] = [
  ...["admin", "institution", "therapist"].flatMap((role) =>
    ["results", "vouchers", "settings", "billing"].map((name) => ({
      name,
      role: role as AuditRole,
      path: `/dashboard/${name}`,
    })),
  ),
  ...["admin", "institution", "therapist"].map((role) => ({
    name: "session-detail",
    role: role as AuditRole,
    path: sessionPath,
  })),
  { name: "users", role: "admin", path: "/dashboard/users" },
  { name: "pricing-plans", role: "admin", path: "/dashboard/pricing-plans" },
  { name: "payment-ledger", role: "admin", path: "/dashboard/payment-ledger" },
];

async function openAudit(
  page: Page,
  route: RouteCase,
  theme: AuditTheme,
  width: number,
): Promise<string[]> {
  const unexpected: string[] = [];
  installAuditDiagnostics(page, unexpected);
  await installAuditStorage(page, route.role, theme);
  await isolateNetwork(page, route.role, unexpected);
  await page.setViewportSize({ width, height: 900 });
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      const main = page.locator("main");
      await expect(main).toBeVisible();
      await expect
        .poll(() => main.textContent(), { message: "main content readiness" })
        .toMatch(/\S+/);
      return unexpected;
}

for (const route of baseline) {
  test(`baseline ${route.role} ${route.name} at 390px dark`, async ({
    page,
  }) => {
    const unexpected = await openAudit(page, route, "dark", 390);
    await auditLayout(
      page,
      `${route.role}-${route.name}-dark-390w`,
      unexpected,
    );
  });
  test(`baseline ${route.role} ${route.name} at 1440px light`, async ({
    page,
  }) => {
    const unexpected = await openAudit(page, route, "light", 1440);
    await auditLayout(
      page,
      `${route.role}-${route.name}-light-1440w`,
      unexpected,
    );
  });
}

for (const route of riskRoutes) {
  for (const width of [360, 768, 1024] as const) {
    test(`risk ${route.role} ${route.name} at ${width}px light`, async ({
      page,
    }) => {
      const unexpected = await openAudit(page, route, "light", width);
      await auditLayout(
        page,
        `${route.role}-${route.name}-light-${width}w`,
        unexpected,
      );
    });
  }
}

for (const role of ["institution", "therapist"] as const) {
  for (const [name, path] of [
    ["users", "/dashboard/users"],
    ["institution-detail", institutionPath],
    ["pricing-plans", "/dashboard/pricing-plans"],
    ["payment-ledger", "/dashboard/payment-ledger"],
  ] as const) {
    test(`${role} is redirected from ${name}`, async ({ page }) => {
      const unexpected: string[] = [];
      installAuditDiagnostics(page, unexpected);
      await installAuditStorage(page, role, "light");
      await isolateNetwork(page, role, unexpected);
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/dashboard$/);
      expect(unexpected, unexpected.join("\n")).toEqual([]);
    });
  }
}

test("unauthenticated protected route redirects to login", async ({ page }) => {
  const unexpected: string[] = [];
  installAuditDiagnostics(page, unexpected);
  await isolateNetwork(page, "admin", unexpected);
  await page.goto("/dashboard/results", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login$/);
  expect(unexpected, unexpected.join("\n")).toEqual([]);
});

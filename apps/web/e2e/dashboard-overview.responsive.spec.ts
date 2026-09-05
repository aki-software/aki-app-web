import { expect, test, type Page, type Route } from "@playwright/test";
import { installAuditDiagnostics } from "./route-audit.helpers";
import {
  adminOverviewFixture,
  auditUsers,
  institutionOverviewFixture,
  triageFixture,
  type AuditRole,
  type AuditTheme,
} from "./dashboard-overview.fixtures";

const apiOrigin = "http://127.0.0.1:3000";
const blockedKnownExternalOrigins = new Set([
  "https://fonts.googleapis.com",
  "https://va.vercel-scripts.com",
]);
const screenshotDirectory = "../../tmp/responsive-audit";
const viewports = [360, 390, 768, 1024, 1440] as const;
const themes: readonly AuditTheme[] = ["light", "dark"];
const roles: readonly AuditRole[] = ["admin", "institution"];

function fakeJwt(user: (typeof auditUsers)[AuditRole]): string {
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    sub: user.id,
    email: user.email,
    role: user.role,
    institutionId: user.institutionId,
    exp: 4_102_444_800,
  })}.audit-signature`;
}

async function installAuditStorage(
  page: Page,
  role: AuditRole,
  theme: AuditTheme,
): Promise<void> {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = `
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
            caret-color: transparent !important;
          }
        `;
    const installStyle = () => document.head?.appendChild(style);
    if (document.head) installStyle();
    else
      document.addEventListener("DOMContentLoaded", installStyle, {
        once: true,
      });
  });
  const user = auditUsers[role];
  await page.addInitScript(
    ({ token, storedUser, savedTheme }) => {
      localStorage.setItem("akit_access_token", token);
      localStorage.setItem("akit_user", JSON.stringify(storedUser));
      localStorage.setItem("theme", savedTheme);
    },
    { token: fakeJwt(user), storedUser: user, savedTheme: theme },
  );
}

async function fulfillDashboardApi(
  route: Route,
  role: AuditRole,
): Promise<void> {
  const requestUrl = new URL(route.request().url());
  const { pathname } = requestUrl;

  if (role === "admin" && pathname === "/sessions/admin/overview") {
    await route.fulfill({ json: adminOverviewFixture });
    return;
  }
  if (role === "admin" && pathname === "/sessions/triage") {
    await route.fulfill({ json: triageFixture });
    return;
  }
  if (
    role === "institution" &&
    pathname === "/institutions/audit-institution-001/overview"
  ) {
    await route.fulfill({ json: institutionOverviewFixture });
    return;
  }

  await route.abort("blockedbyclient");
  throw new Error(`Unexpected dashboard API request: ${requestUrl.toString()}`);
}

async function isolateNetwork(
  page: Page,
  role: AuditRole,
  unexpectedCalls: string[],
): Promise<void> {
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === apiOrigin) {
      try {
        await fulfillDashboardApi(route, role);
      } catch (error) {
        unexpectedCalls.push(
          error instanceof Error ? error.message : String(error),
        );
      }
      return;
    }

    if (requestUrl.origin === "http://127.0.0.1:4173") {
      await route.continue();
      return;
    }

    if (blockedKnownExternalOrigins.has(requestUrl.origin)) {
      await route.fulfill({
        status: 200,
        contentType:
          requestUrl.origin === "https://fonts.googleapis.com"
            ? "text/css"
            : "application/javascript",
        body: "",
      });
      return;
    }

    unexpectedCalls.push(
      `Blocked unexpected external request: ${requestUrl.toString()}`,
    );
    await route.abort("blockedbyclient");
  });
}

type ClippedControl = {
  label: string;
  tag: string;
  rect: { left: number; right: number; top: number; bottom: number };
};

async function findClippedControls(page: Page): Promise<ClippedControl[]> {
  return page.evaluate(() => {
    const controls = Array.from(
      document.querySelectorAll(
        "header button, header a, header input, header select, header summary, main button, main a, main input, main select, main summary",
      ),
    );
    return controls.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return [];
      const clipped = rect.left < 0 || rect.right > window.innerWidth;
      if (!clipped) return [];
      const label =
        element.getAttribute("aria-label") ||
        element.textContent?.trim() ||
        (element instanceof HTMLInputElement
          ? element.placeholder || element.value
          : "") ||
        element.getAttribute("title") ||
        element.tagName.toLowerCase();
      return [
        {
          label: label.replace(/\s+/g, " ").trim(),
          tag: element.tagName.toLowerCase(),
          rect: {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          },
        },
      ];
    });
  });
}

for (const role of roles) {
  for (const theme of themes) {
    for (const width of viewports) {
      test(`${role} overview at ${width}px in ${theme} theme`, async ({
        page,
      }) => {
        const unexpectedCalls: string[] = [];

        installAuditDiagnostics(page, unexpectedCalls);
        await installAuditStorage(page, role, theme);
        await isolateNetwork(page, role, unexpectedCalls);
        await page.setViewportSize({ width, height: 900 });

        await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(
          page.getByText(
            role === "admin" ? "Centro de operación" : "Resumen de vouchers",
          ),
        ).toBeVisible();

        await expect
          .poll(() =>
            page.evaluate(
              () =>
                document.documentElement.scrollWidth <=
                document.documentElement.clientWidth,
            ),
          )
          .toBe(true);

        const clippedControls = await findClippedControls(page);
        await page.screenshot({
          path: `${screenshotDirectory}/${role}-${theme}-${width}w.png`,
          fullPage: true,
        });

        expect(
          clippedControls,
          `Clipped interactive controls: ${JSON.stringify(clippedControls)}`,
        ).toEqual([]);
        expect(unexpectedCalls, unexpectedCalls.join("\n")).toEqual([]);
      });
    }
  }
}

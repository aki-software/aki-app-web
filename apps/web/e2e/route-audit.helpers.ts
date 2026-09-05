import { expect, type Page, type Route } from "@playwright/test";
import {
  adminOverview,
  activity,
  auditUsers,
  categories,
  ids,
  institution,
  metrics,
  overview,
  plan,
  session,
  voucher,
  voucherBatch,
  type AuditRole,
  type AuditTheme,
} from "./route-audit.fixtures";

const apiOrigin = "http://127.0.0.1:3000";
const appOrigin = "http://127.0.0.1:4173";
const localExternalOrigins = new Set([
  "https://fonts.googleapis.com",
  "https://va.vercel-scripts.com",
]);

function fakeJwt(role: AuditRole): string {
  const user = auditUsers[role];
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ sub: user.id, email: user.email, role: user.role, institutionId: user.institutionId, exp: 4102444800 })}.audit-signature`;
}

export async function installAuditStorage(
  page: Page,
  role: AuditRole,
  theme: AuditTheme,
): Promise<void> {
  await page.addInitScript(
    ({ token, user, savedTheme }) => {
      localStorage.setItem("akit_access_token", token);
      localStorage.setItem("akit_user", JSON.stringify(user));
      localStorage.setItem("theme", savedTheme);
      const style = document.createElement("style");
      style.textContent =
        "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";
      if (document.head) document.head.appendChild(style);
      else
        document.addEventListener(
          "DOMContentLoaded",
          () => document.head.appendChild(style),
          { once: true },
        );
    },
    { token: fakeJwt(role), user: auditUsers[role], savedTheme: theme },
  );
}

async function fulfillApi(
  route: Route,
  role: AuditRole,
  url: URL,
): Promise<void> {
  const { pathname } = url;
  const json = (body: unknown) => route.fulfill({ json: body });
  if (pathname === "/sessions") return json({ data: [session] });
  if (pathname === `/sessions/${ids.session}`) return json(session);
  if (pathname === `/sessions/${ids.session}/metrics`) return json(metrics);
  if (pathname === "/sessions/triage")
    return json({
      data: [],
      meta: { total: 0, page: 1, limit: 20, flaggedCount: 0 },
    });
  if (pathname === "/sessions/metrics/aggregate")
    return json({
      selectivityDistribution: { selective: 0, balanced: 1, exploratory: 0 },
      fatigueRate: 0,
      rushRate: 0,
      avgReliabilityScore: 88,
      totalSessions: 1,
      eligibleSessions: 1,
      trends: {
        daily: [
          { date: "2026-03-06", sessions: 1, fatigueRate: 0, rushRate: 0 },
        ],
      },
    });
  if (pathname === "/sessions/admin/overview") return json(adminOverview);
  if (pathname === "/sessions/admin/activity") return json(activity);
  if (pathname === `/institutions/${ids.institution}/overview`)
    return json(overview);
  if (pathname === `/institutions/${ids.institution}/stats`)
    return json({ totalSessions: 1, totalVouchers: 10, availableVouchers: 9 });
  if (pathname === "/institutions") return json({ data: [institution] });
  if (pathname === "/users")
    return json({
      data: [
        {
          id: ids.therapist,
          name: "Terapeuta de Auditoría",
          email: "therapist.audit@example.test",
          institutionId: ids.institution,
          institution: { name: institution.name },
          isActive: true,
        },
      ],
    });
  if (pathname === "/categories") return json(categories);
  if (pathname === "/tres-areas/combinations")
    return json({
      data: [
        {
          id: "combination-1",
          title: "RIA",
          area1: "R",
          area2: "I",
          area3: "A",
          narrative: "Combinación de auditoría",
        },
      ],
      total: 1,
      page: 1,
      limit: 1000,
    });
  if (pathname === "/stats/vouchers")
    return json({
      stats: {
        totalBatches: 1,
        totalVouchers: 10,
        availableVouchers: 9,
        usedVouchers: 1,
        sentVouchers: 0,
        expiredVouchers: 0,
        revokedVouchers: 0,
        redemptionRate: 10,
      },
      alerts: [
        { severity: "warning", message: "Lote de auditoría disponible" },
      ],
    });
  if (pathname === "/vouchers")
    return json({ data: [voucher], count: 1, page: 1, limit: 10 });
  if (pathname === "/vouchers/batches")
    return json({ data: [voucherBatch], count: 1, page: 1, limit: 6 });
  if (pathname === "/payments/plans" || pathname === "/admin/pricing-plans")
    return json([plan]);
  if (pathname === "/payments/history")
    return json({
      transactions: [
        {
          id: ids.payment,
          gateway: "STRIPE",
          externalReference: "audit-payment",
          status: "APPROVED",
          amount: 25,
          currency: "USD",
          createdAt: "2026-03-01T00:00:00.000Z",
          plan,
        },
      ],
      totalPaid: 25,
      currentBalance: 9,
    });
  if (pathname === "/admin/payment-ledger")
    return json({
      items: [
        {
          voucherBatchId: ids.batch,
          checkoutAttemptId: null,
          paymentEventId: ids.payment,
          institution: { id: ids.institution, name: institution.name },
          buyer: {
            userId: ids.therapist,
            name: "Terapeuta de Auditoría",
            email: "therapist.audit@example.test",
          },
          commercial: { pricingPlanId: ids.plan, planName: plan.name },
          amount: { value: "25.00", currency: "USD" },
          payment: {
            gateway: "STRIPE",
            externalReference: "audit-payment",
            settledAt: "2026-03-01T00:00:00.000Z",
          },
          fulfillment: {
            state: "FULFILLED",
            fulfilledAt: "2026-03-01T00:01:00.000Z",
            expectedVoucherCount: 10,
            actualVoucherCount: 10,
            discrepancy: 0,
          },
          operationalState: "ACCREDITED",
          notifications: { buyer: null, platformAdmin: null },
        },
      ],
      page: 1,
      pageSize: 6,
      total: 1,
      totalPages: 1,
      sort: "SETTLED_DESC",
    });
  throw new Error(`Unexpected API request for ${role}: ${url}`);
}

export function installAuditDiagnostics(
  page: Page,
  unexpected: string[],
): void {
  page.on("pageerror", (error) => {
    unexpected.push(`Page error: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      unexpected.push(`Console error: ${message.text()}`);
    }
  });
}

async function abortRoute(route: Route): Promise<void> {
  try {
    await route.abort("blockedbyclient");
  } catch {
    // The request may have been handled by the browser while the callback ran.
  }
}

export async function isolateNetwork(
  page: Page,
  role: AuditRole,
  unexpected: string[],
): Promise<void> {
  await page.route("**/*", async (route) => {
    const requestUrl = route.request().url();
    let url: URL;
    try {
      url = new URL(requestUrl);
    } catch {
      unexpected.push(`Blocked invalid request URL: ${requestUrl}`);
      await abortRoute(route);
      return;
    }

    if (url.origin === apiOrigin) {
      try {
        await fulfillApi(route, role, url);
      } catch (error) {
        unexpected.push(error instanceof Error ? error.message : String(error));
        await abortRoute(route);
      }
    } else if (url.origin === appOrigin) await route.continue();
    else if (localExternalOrigins.has(url.origin))
      await route.fulfill({
        status: 200,
        contentType: url.origin.includes("fonts")
          ? "text/css"
          : "application/javascript",
        body: "",
      });
    else {
      unexpected.push(`Blocked unexpected external request: ${url}`);
      await abortRoute(route);
    }
  });
}

export async function auditLayout(
  page: Page,
  filename: string,
  unexpected: string[],
): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.screenshot({
    path: `../../tmp/responsive-audit/routes/${filename}.png`,
    fullPage: true,
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  const clipped = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        "header button,header a,main button,main a,main input,main select,main summary",
      ),
    ).flatMap((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width &&
        rect.height &&
        (rect.left < 0 || rect.right > innerWidth)
        ? [
            {
              label:
                element.getAttribute("aria-label") ||
                element.textContent?.trim() ||
                element.tagName,
              left: rect.left,
              right: rect.right,
            },
          ]
        : [];
    }),
  );
  expect(
    clipped,
    `Clipped interactive controls: ${JSON.stringify(clipped)}`,
  ).toEqual([]);
  expect(unexpected, unexpected.join("\n")).toEqual([]);
}

import type { PaymentGateway } from "@akit/contracts";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export const PUBLIC_TEST_URL =
  import.meta.env.VITE_PUBLIC_TEST_URL ?? "https://akit-test.com";
export const WHATSAPP_BASE_URL =
  import.meta.env.VITE_WHATSAPP_URL ?? "https://wa.me/";

const configuredPaymentGateway = import.meta.env.VITE_PAYMENT_GATEWAY;
export const PAYMENT_GATEWAY: PaymentGateway =
  configuredPaymentGateway === "STRIPE" ? "STRIPE" : "MERCADO_PAGO";

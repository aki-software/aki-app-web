import { ConfigService } from '@nestjs/config';
import { MercadoPagoAdapter } from '../adapters/mercadopago.adapter.js';
import { SimulationPaymentGatewayAdapter } from '../adapters/simulation.adapter.js';
import { StripeAdapter } from '../adapters/stripe.adapter.js';
import type { PaymentGatewayAdapter } from '../interfaces/payment-gateway.adapter.js';
import { resolvePaymentConfiguration } from './payment-configuration.js';

export type PaymentGatewayName = 'MERCADO_PAGO' | 'STRIPE';

export function bindPaymentGatewayAdapter(
  gateway: PaymentGatewayName,
  configService: ConfigService,
  simulationAdapter: SimulationPaymentGatewayAdapter,
  environment: NodeJS.ProcessEnv,
): PaymentGatewayAdapter {
  if (resolvePaymentConfiguration(environment).simulationEnabled) {
    return simulationAdapter;
  }
  return gateway === 'MERCADO_PAGO'
    ? new MercadoPagoAdapter(configService)
    : new StripeAdapter(configService);
}

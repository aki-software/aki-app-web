import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SimulationPaymentGatewayAdapter } from './adapters/simulation.adapter.js';
import { bindPaymentGatewayAdapter } from './config/payment-gateway-binding.js';
import {
  PAYMENT_GATEWAY_MP,
  PAYMENT_GATEWAY_STRIPE,
} from './interfaces/payment-gateway.adapter.js';

@Module({
  imports: [ConfigModule],
  providers: [
    SimulationPaymentGatewayAdapter,
    {
      provide: PAYMENT_GATEWAY_MP,
      inject: [ConfigService, SimulationPaymentGatewayAdapter],
      useFactory: (
        config: ConfigService,
        simulation: SimulationPaymentGatewayAdapter,
      ) =>
        bindPaymentGatewayAdapter(
          'MERCADO_PAGO',
          config,
          simulation,
          process.env,
        ),
    },
    {
      provide: PAYMENT_GATEWAY_STRIPE,
      inject: [ConfigService, SimulationPaymentGatewayAdapter],
      useFactory: (
        config: ConfigService,
        simulation: SimulationPaymentGatewayAdapter,
      ) => bindPaymentGatewayAdapter('STRIPE', config, simulation, process.env),
    },
  ],
  exports: [PAYMENT_GATEWAY_MP, PAYMENT_GATEWAY_STRIPE],
})
export class PaymentGatewayModule {}

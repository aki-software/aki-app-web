import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PaymentGateway,
  GatewayName,
} from '../interfaces/payment-gateway.interface.js';

@Injectable()
export class PaymentGatewayRegistry {
  private readonly adapters = new Map<GatewayName, PaymentGateway>();

  register(adapter: PaymentGateway): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: GatewayName): PaymentGateway {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new NotFoundException(
        `Payment gateway "${name}" is not registered`,
      );
    }
    return adapter;
  }

  getAll(): PaymentGateway[] {
    return Array.from(this.adapters.values());
  }
}

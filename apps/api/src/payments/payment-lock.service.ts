import { Injectable, Logger, ConflictException } from '@nestjs/common';

@Injectable()
export class PaymentLockService {
  private readonly logger = new Logger(PaymentLockService.name);
  private readonly lockedTokens = new Set<string>();

  /**
   * Intenta adquirir un lock para el token especificado.
   * Si ya está procesándose, lanza una excepción (HTTP 409 Conflict).
   * @param token El token de compra (purchaseToken)
   */
  acquireLock(token: string): void {
    if (this.lockedTokens.has(token)) {
      this.logger.warn(`El token de pago ${token} ya está siendo procesado.`);
      throw new ConflictException('Este pago ya está siendo procesado.');
    }
    this.lockedTokens.add(token);
    this.logger.debug(`Lock adquirido para el token ${token}`);
  }

  /**
   * Libera el lock para el token especificado.
   * @param token El token de compra
   */
  releaseLock(token: string): void {
    this.lockedTokens.delete(token);
    this.logger.debug(`Lock liberado para el token ${token}`);
  }
}

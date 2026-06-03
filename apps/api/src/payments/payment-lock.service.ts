import { Injectable, Logger, ConflictException } from '@nestjs/common';

@Injectable()
export class PaymentLockService {
  private readonly logger = new Logger(PaymentLockService.name);
  private readonly lockedTokens = new Map<string, number>();
  private readonly LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Intenta adquirir un lock para el token especificado.
   * Si ya está procesándose, lanza una excepción (HTTP 409 Conflict).
   * @param token El token de compra (purchaseToken)
   */
  acquireLock(token: string): void {
    const existing = this.lockedTokens.get(token);
    if (existing && Date.now() < existing) {
      this.logger.warn(`El token de pago ${token} ya está siendo procesado.`);
      throw new ConflictException('Este pago ya está siendo procesado.');
    }
    this.lockedTokens.set(token, Date.now() + this.LOCK_TTL_MS);
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

import { Injectable, Logger, ConflictException } from '@nestjs/common';

@Injectable()
export class PaymentLockService {
  private readonly logger = new Logger(PaymentLockService.name);
  private readonly lockedTokens = new Map<string, number>();
  private readonly LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Intenta adquirir un lock para el token especificado de forma asíncrona.
   * Si ya está procesándose, reintenta durante unos segundos antes de lanzar una excepción.
   * @param token El token de compra (purchaseToken)
   */
  async acquireLock(token: string): Promise<void> {
    const maxRetries = 5;
    const delayMs = 500;

    for (let i = 0; i < maxRetries; i++) {
      const existing = this.lockedTokens.get(token);
      if (!existing || Date.now() >= existing) {
        this.lockedTokens.set(token, Date.now() + this.LOCK_TTL_MS);
        this.logger.debug(`Lock adquirido para el token ${token}`);
        return;
      }
      this.logger.warn(
        `El token de pago ${token} ya está siendo procesado. Reintentando adquirir lock... (Intento ${i + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    this.logger.warn(`No se pudo adquirir el lock para el token ${token} tras reintentos.`);
    throw new ConflictException('Este pago ya está siendo procesado.');
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

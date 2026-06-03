export interface IReportCacheService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMs?: number): void;
  getOrCreate<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T>;
  withLock<T>(key: string, factory: () => Promise<T>): Promise<T>;
}

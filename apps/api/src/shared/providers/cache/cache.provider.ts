/**
 * CacheProvider — PORT for key/value caching.
 *
 * The concrete adapter (Redis) will be implemented in a future story and bound
 * to {@link CACHE_PROVIDER}. Domain code depends only on this abstraction.
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  /** Stores a value with an optional TTL in seconds. */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

/** DI token used to inject a {@link CacheProvider}. */
export const CACHE_PROVIDER = Symbol('CACHE_PROVIDER');

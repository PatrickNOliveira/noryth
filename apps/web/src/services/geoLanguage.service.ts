/**
 * GeoLanguageService — isolated, optional IP → country detection.
 *
 * This is the ONLY place aware of any geo/IP provider. Components never call it
 * directly; the i18n detection pipeline does. It is best-effort: if no provider
 * is configured (`REACT_APP_GEO_API_URL`) or the request fails/timeouts, it
 * returns `null` and detection falls back to browser + default.
 *
 * The endpoint is expected to return JSON containing a 2-letter country code in
 * one of the common fields (`country_code`, `countryCode`, `country`).
 */

const GEO_API_URL = process.env.REACT_APP_GEO_API_URL;
const TIMEOUT_MS = 3500;

function extractCountry(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const raw = obj.country_code ?? obj.countryCode ?? obj.country;
  if (typeof raw === 'string' && raw.length >= 2) {
    return raw.slice(0, 2).toUpperCase();
  }
  return null;
}

export const geoLanguageService = {
  /** Whether an IP provider is configured for this build. */
  isConfigured(): boolean {
    return typeof GEO_API_URL === 'string' && GEO_API_URL.length > 0;
  },

  /**
   * Best-effort ISO 3166-1 alpha-2 country code, or null. Never throws.
   */
  async detectCountry(): Promise<string | null> {
    if (!this.isConfigured()) return null;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(GEO_API_URL as string, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return extractCountry(data);
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  },
};

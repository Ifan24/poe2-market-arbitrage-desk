export const DEFAULT_BROWSER_USER_AGENT: string;
export const DEFAULT_PROVIDER_USER_AGENT: string;
export const DEFAULT_FETCH_RETRY_ATTEMPTS: number;

export function wait(ms: number): Promise<void>;
export function fetchWithRetry(
  url: string | URL,
  options?: RequestInit,
  retryOptions?: {
    label?: string | URL;
    attempts?: number;
  }
): Promise<Response>;
export function fetchJson(
  url: string | URL,
  options?: {
    headers?: Record<string, string>;
    label?: string | URL;
    attempts?: number;
  }
): Promise<unknown>;
export function fetchText(
  url: string | URL,
  options?: {
    headers?: Record<string, string>;
    label?: string | URL;
    attempts?: number;
  }
): Promise<string>;
export function fetchBuffer(
  url: string | URL,
  options?: {
    headers?: Record<string, string>;
    label?: string | URL;
    attempts?: number;
  }
): Promise<Buffer>;
export function convertImageToWebp(
  buffer: Buffer,
  options?: {
    fallbackToOriginal?: boolean;
  }
): Promise<Buffer | null>;

export const DEFAULT_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export const DEFAULT_PROVIDER_USER_AGENT = "poe2-market-arbitrage-desk";
export const DEFAULT_FETCH_RETRY_ATTEMPTS = Number(process.env.POE2_FETCH_RETRY_ATTEMPTS || "5");

export function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function fetchWithRetry(url, options = {}, { label = url, attempts = DEFAULT_FETCH_RETRY_ATTEMPTS } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }

      lastError = new Error(`${label} failed: ${response.status} ${response.statusText}`);
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        lastError.retryable = false;
        throw lastError;
      }
    } catch (error) {
      if (error?.retryable === false) {
        throw error;
      }
      lastError = error;
    }

    if (attempt < attempts) {
      const delayMs = 750 * attempt;
      console.warn(`${label} fetch attempt ${attempt}/${attempts} failed; retrying in ${delayMs}ms`);
      await wait(delayMs);
    }
  }

  throw lastError;
}

export async function fetchJson(url, { headers = {}, label = url, attempts } = {}) {
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        accept: "application/json",
        "user-agent": DEFAULT_PROVIDER_USER_AGENT,
        ...headers
      }
    },
    { label, attempts }
  );

  return response.json();
}

export async function fetchText(url, { headers = {}, label = url, attempts } = {}) {
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        accept: "text/html",
        "user-agent": DEFAULT_PROVIDER_USER_AGENT,
        ...headers
      }
    },
    { label, attempts }
  );

  return response.text();
}

export async function fetchBuffer(url, { headers = {}, label = url, attempts } = {}) {
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8",
        "user-agent": DEFAULT_BROWSER_USER_AGENT,
        ...headers
      }
    },
    { label, attempts }
  );

  return Buffer.from(await response.arrayBuffer());
}

export async function convertImageToWebp(buffer, { fallbackToOriginal = true } = {}) {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buffer).webp({ quality: 82, effort: 5 }).toBuffer();
  } catch {
    return fallbackToOriginal ? buffer : null;
  }
}

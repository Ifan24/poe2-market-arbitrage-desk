export const HOSTED_REFRESH_DISABLED_MESSAGE =
  "Runtime refresh is disabled by default. Use the scheduled snapshot pipeline, or explicitly configure a writable trusted runtime.";

export const HOSTED_REFRESH_UNAUTHORIZED_MESSAGE =
  "Runtime refresh requires a valid bearer token.";

export function isHostedRuntimeRefreshDisabled(
  env: Record<string, string | undefined> = process.env
) {
  return env.MARKET_REFRESH_ALLOW_RUNTIME_WRITE !== "1";
}

export function isHostedRuntimeRefreshAuthorized(
  authorization: string | null,
  env: Record<string, string | undefined> = process.env
) {
  const token = env.MARKET_REFRESH_TOKEN;
  return Boolean(token) && authorization === `Bearer ${token}`;
}

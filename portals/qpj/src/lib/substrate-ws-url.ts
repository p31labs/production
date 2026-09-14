export function resolveWsBaseUrl(
  substrateUrl: string | null,
  wsBase: string | null,
): string | null {
  return wsBase ?? substrateUrl;
}
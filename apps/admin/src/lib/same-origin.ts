export function sameOrigin(
  origin: string | null,
  host: string | null,
  production: boolean,
): boolean {
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    return (
      url.host === host &&
      (production ? url.protocol === "https:" : ["http:", "https:"].includes(url.protocol))
    );
  } catch {
    return false;
  }
}

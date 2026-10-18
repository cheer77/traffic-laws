import { headers } from "next/headers";
export async function assertSameOrigin(): Promise<void> {
  const incoming = await headers();
  const origin = incoming.get("origin"),
    host = incoming.get("host");
  if (!origin || !host) throw new Error("Недозволене джерело запиту");
  const parsed = new URL(origin);
  if (
    parsed.host !== host ||
    (process.env.NODE_ENV === "production" && parsed.protocol !== "https:")
  )
    throw new Error("Недозволене джерело запиту");
}

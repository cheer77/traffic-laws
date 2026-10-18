import { headers } from "next/headers";
import { sameOrigin } from "./same-origin";
export async function assertSameOrigin(): Promise<void> {
  const incoming = await headers();
  if (
    !sameOrigin(incoming.get("origin"), incoming.get("host"), process.env.NODE_ENV === "production")
  )
    throw new Error("Недозволене джерело запиту");
}

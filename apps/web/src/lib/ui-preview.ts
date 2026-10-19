import { headers } from "next/headers";
import { isUiPreviewRequestAllowed, UI_PREVIEW_USERS } from "@traffic-laws/ui-preview";

export async function isUiPreview(): Promise<boolean> {
  if (process.env.NODE_ENV !== "development" || process.env.UI_PREVIEW === "false") return false;
  const incoming = await headers();
  return isUiPreviewRequestAllowed({
    nodeEnv: process.env.NODE_ENV,
    enabled: process.env.UI_PREVIEW,
    host: incoming.get("host"),
  });
}

export async function uiPreviewApiResponse(path: string): Promise<unknown> {
  if (path === "/users/me") return UI_PREVIEW_USERS[1];
  throw new Error("Цей запит недоступний у локальній школі");
}

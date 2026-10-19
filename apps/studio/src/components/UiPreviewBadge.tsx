"use client";

import { useSyncExternalStore } from "react";
import { isUiPreviewRequestAllowed, UI_PREVIEW_LABEL } from "@traffic-laws/ui-preview";

export function UiPreviewBadge() {
  const visible = useSyncExternalStore(
    () => () => undefined,
    () =>
      isUiPreviewRequestAllowed({
        nodeEnv: process.env.NODE_ENV,
        enabled: process.env.NEXT_PUBLIC_UI_PREVIEW,
        host: window.location.host,
      }),
    () => false,
  );
  return visible ? <div className="ui-preview-badge">{UI_PREVIEW_LABEL} · локальна сцена</div> : null;
}

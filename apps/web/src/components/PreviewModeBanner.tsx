import { UI_PREVIEW_LABEL } from "@traffic-laws/ui-preview";
import { isUiPreview } from "@/lib/ui-preview";

export async function PreviewModeBanner() {
  if (!(await isUiPreview())) return null;
  return <div className="preview-mode-banner">{UI_PREVIEW_LABEL} · дані не зберігаються</div>;
}

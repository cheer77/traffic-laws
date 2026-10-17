import { useComposerStore, type ComposerMode } from "@/stores/useComposerStore";
import { useStudioStore } from "@/stores/useStudioStore";
export function changeMode(mode: ComposerMode) {
  const studio = useStudioStore.getState(),
    composer = useComposerStore.getState();
  const editorSelection = composer.mode === "editor" ? studio.selectedId : composer.editorSelection;
  if (composer.mode === "editor") useComposerStore.setState({ editorSelection });
  if (studio.preview) studio.setPreview(false);
  composer.setMode(mode);
  if (mode !== "library") {
    const id = composer.scene.objects.some((item) => item.instanceId === editorSelection)
      ? editorSelection
      : (composer.scene.objects[0]?.instanceId ?? "");
    useStudioStore.setState({ selectedId: id, inspection: null });
  }
}
export function selectAdded(id: string | undefined) {
  if (!id) return;
  changeMode("editor");
  useStudioStore.getState().selectObject(id);
}

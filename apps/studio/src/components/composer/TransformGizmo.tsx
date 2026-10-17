"use client";
import { TransformControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import type { TransformControls as TransformControlsImpl } from "three-stdlib";
import { useComposerStore } from "@/stores/useComposerStore";
import { useStudioStore } from "@/stores/useStudioStore";

export function TransformGizmo() {
  const shadowDirty = useRef(false);
  useFrame(({ gl }) => {
    if (shadowDirty.current) {
      gl.shadowMap.needsUpdate = true;
      shadowDirty.current = false;
    }
  });
  const control = useRef<TransformControlsImpl>(null);
  const scene = useThree((s) => s.scene),
    invalidate = useThree((s) => s.invalidate);
  const definition = useComposerStore((s) => s.scene),
    tool = useComposerStore((s) => s.tool);
  const selected = useStudioStore((s) => s.selectedId),
    visible = useStudioStore((s) => s.visible),
    layers = useStudioStore((s) => s.layers);
  useLayoutEffect(() => {
    const target = scene.getObjectByName(selected),
      controls = control.current;
    if (target) controls?.attach(target);
    else controls?.detach();
    return () => {
      controls?.detach();
      useComposerStore.getState().setDragging(false);
    };
  }, [scene, selected, definition, visible, layers]);
  return (
    <TransformControls
      ref={control}
      mode={tool === "rotate" ? "rotate" : "translate"}
      space="world"
      size={0.8}
      onMouseDown={() => {
        useComposerStore.getState().setDragging(true);
        useStudioStore.getState().setCamera("free");
      }}
      onObjectChange={() => {
        shadowDirty.current = true;
        invalidate();
      }}
      onMouseUp={() => {
        const object = scene.getObjectByName(selected);
        if (object) {
          const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
          useComposerStore
            .getState()
            .transform(selected, {
              position: [object.position.x, object.position.y, object.position.z],
              rotation: [wrap(object.rotation.x), wrap(object.rotation.y), wrap(object.rotation.z)],
              scale: [object.scale.x, object.scale.y, object.scale.z],
            });
          // Restore the last valid transform after a rejected out-of-range gesture.
          const saved = useComposerStore
            .getState()
            .scene.objects.find((item) => item.instanceId === selected);
          if (saved) {
            object.position.fromArray(saved.transform.position);
            object.rotation.set(...saved.transform.rotation);
            object.scale.fromArray(saved.transform.scale);
          }
        }
        useComposerStore.getState().setDragging(false);
        shadowDirty.current = true;
        invalidate();
      }}
    />
  );
}

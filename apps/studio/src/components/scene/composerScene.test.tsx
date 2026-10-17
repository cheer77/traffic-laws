import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactThreeTest } from "@react-three/test-renderer";
import { Mesh, type Object3D } from "three";
import { createScene, parseSceneJSON, serializeScene } from "@traffic-laws/scene-engine";
import { SceneEnvironment, SceneRenderer } from "@traffic-laws/scene-engine/react";
import { SCENE_ASSETS } from "@/lib/sceneAssets";
import { useStudioStore } from "@/stores/useStudioStore";
import { useComposerStore } from "@/stores/useComposerStore";
import { SceneObjects } from "./SceneObjects";
import { VehicleModel } from "./vehicles/VehicleModel";
import { VEHICLES } from "@/lib/studioConfig";
import { Buildings, Greenery, StreetFurniture } from "./environment/CityEnvironment";
import { Characters } from "./characters/Characters";
import { RoadSigns } from "./signs/RoadSigns";
import { TrafficLights } from "./traffic-lights/TrafficLights";
import { IntersectionRoad } from "./roads/IntersectionRoad";

const renderers: ReactThreeTest.Renderer[] = [];
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("self", { requestAnimationFrame: () => 0, cancelAnimationFrame: () => {} });
  useStudioStore.getState().reset();
});
afterEach(async () => {
  for (const renderer of renderers) await renderer.unmount();
  renderers.length = 0;
  vi.unstubAllGlobals();
});
function meshSignature(root: Object3D) {
  root.updateWorldMatrix(true, true);
  const values: string[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh) || object.userData.helper) return;
    values.push(
      JSON.stringify({
        geometry: object.geometry.uuid,
        material: Array.isArray(object.material)
          ? object.material.map((m) => m.uuid)
          : object.material.uuid,
        matrix: object.matrixWorld.elements.map((n) => +n.toFixed(8)),
        visible: object.visible,
        cast: object.castShadow,
        receive: object.receiveShadow,
      }),
    );
  });
  return values.sort();
}
describe("composer render regression", () => {
  it("matches original geometry, materials, world transforms and shadow flags mesh for mesh", async () => {
    // Original adapters are kept for isolated library inspection and provide an independent reference.
    const original = await create(
      <group>
        <IntersectionRoad />
        <Buildings />
        <Greenery />
        <StreetFurniture />
        <Characters />
        <RoadSigns />
        <TrafficLights />
        {VEHICLES.map((asset) => (
          <VehicleModel key={asset.id} asset={asset} />
        ))}
      </group>,
    );
    renderers.push(original);
    const composed = await create(<SceneObjects />);
    renderers.push(composed);
    expect(meshSignature(composed.scene.instance)).toEqual(meshSignature(original.scene.instance));
    for (const asset of SCENE_ASSETS) {
      const instance = composed.scene.instance.getObjectByName(asset.id)!;
      expect(instance.position.toArray()).toEqual(asset.position);
      expect(instance.rotation.y).toBe(asset.rotation);
    }
  });
  it("renders imported transforms and signals without Studio and with unchanged resources", async () => {
    const definition = createScene();
    definition.objects = definition.objects.filter(
      (o) => o.instanceId === "vehicle-sedan" || o.instanceId === "light-s",
    );
    definition.objects[0].properties.signal = "yellow";
    definition.objects[1].transform = {
      position: [10, 2, 4],
      rotation: [0, Math.PI / 2, 0],
      scale: [1.2, 1.2, 1.2],
    };
    const renderer = await create(
      <SceneRenderer scene={parseSceneJSON(serializeScene(definition))} />,
    );
    renderers.push(renderer);
    const car = renderer.scene.instance.getObjectByName("vehicle-sedan")!;
    expect(car.position.toArray()).toEqual([10, 2, 4]);
    expect(car.rotation.y).toBe(Math.PI / 2);
    expect(car.scale.toArray()).toEqual([1.2, 1.2, 1.2]);
    const signature = meshSignature(renderer.scene.instance);
    await renderer.update(<SceneRenderer scene={parseSceneJSON(serializeScene(definition))} />);
    expect(meshSignature(renderer.scene.instance)).toEqual(signature);
  });
  it("selects added objects, preserves GPU resources, and removes editor helpers in view", async () => {
    const id = useComposerStore.getState().add("vehicle.police.ua")!;
    const renderer = await create(<SceneObjects />);
    renderers.push(renderer);
    const car = renderer.scene.instance.getObjectByName(id)!;
    const signature = meshSignature(car);
    await renderer.fireEvent(renderer.scene.findByProps({ name: id }), "click", { delta: 0 });
    expect(useStudioStore.getState().selectedId).toBe(id);
    expect(meshSignature(car)).toEqual(signature);
    await act(async () => useComposerStore.getState().setMode("view"));
    let helpers = 0;
    renderer.scene.instance.traverse((o) => {
      if (o.userData.helper) helpers++;
    });
    expect(helpers).toBe(0);
  });
  it("keeps the urban light profile and shadow volume", async () => {
    const renderer = await create(<SceneEnvironment />);
    renderers.push(renderer);
    const sun = renderer.scene.findByProps({ name: "studio-sun" });
    expect(sun.props.position).toEqual([-24, 38, 18]);
    expect(sun.props.intensity).toBe(1.8);
    expect(sun.props["shadow-mapSize"]).toEqual([1024, 1024]);
    expect(sun.props["shadow-camera-left"]).toBe(-40);
  });
});

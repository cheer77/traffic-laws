import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { diagramPath, diagramTransform } from "./diagram";
import { routePose, sampleMotion } from "./motion";
import { TRAINING_SCENARIOS, signalAt } from "./scenarios";
import TrainerDiagram from "./TrainerDiagram";

describe("2D / 3D scenario parity", () => {
  for (const scenario of TRAINING_SCENARIOS) {
    it(`${scenario.id}: same cars, initial signals, priority signs and routes`, () => {
      const html = renderToStaticMarkup(
        <TrainerDiagram
          scenario={scenario}
          playback={{ current: { time: 0, running: false, speed: 1 } }}
          selected="a"
          onSelect={() => undefined}
          playing={false}
          onFinished={() => undefined}
        />,
      );
      expect(html).toContain("не офіційне екзаменаційне зображення");
      expect(html.match(/data-car=/g)).toHaveLength(scenario.cars.length);
      expect(html).not.toContain("<image");
      expect(html.includes("Дати дорогу")).toBe(scenario.control === "priority-signs");
      expect(html.includes("Головна дорога")).toBe(scenario.control === "priority-signs");
      for (const car of scenario.cars) {
        expect(html).toContain(`transform="${diagramTransform(sampleMotion(car, 0))}"`);
        expect(html).toContain(`aria-label="Обрати ${car.label}"`);
        const points = diagramPath(car).split(" ");
        points.forEach((point, index) => {
          const pose = routePose(car, (27 * index) / 64, { x: 0, z: 0, yaw: 0 });
          expect(point).toBe(`${index ? "L" : "M"}${pose.x},${pose.z}`);
        });
      }
      for (const approach of ["south", "east", "north", "west"] as const) {
        const colors = { off: "#44504a", red: "#f44846", yellow: "#ffd43b", green: "#54e589" };
        expect(html).toContain(
          `data-signal="${approach}" r=".65" fill="${colors[signalAt(scenario, approach, 0)]}"`,
        );
      }
    });
  }
  it("projects heading into SVG without mirroring left/right turns", () => {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const angle = -yaw;
      // SVG transforms the local forward vector (0, 1) to the same x/z tangent as Three.
      expect(-Math.sin(angle)).toBeCloseTo(Math.sin(yaw));
      expect(Math.cos(angle)).toBeCloseTo(Math.cos(yaw));
      expect(diagramTransform({ x: 2.4, z: 12, yaw })).toBe(
        `translate(2.4 12) rotate(${(-yaw * 180) / Math.PI})`,
      );
    }
  });
});

import { AssetBuilder, type Point } from "../vehicles/assetBuilder";
import { AssetParts } from "../AssetParts";
import type { MaterialName } from "../resources";

function person(index: number) {
  const b = new AssetBuilder(),
    senior = index === 2,
    woman = index === 1,
    youth = index === 3;
  const shirt: MaterialName = (["teal", "shirt", "cream", "blue"] as const)[index];
  const skin: MaterialName = youth ? "skinDark" : "skin",
    hair: MaterialName = senior ? "chrome" : "hair";
  const height = woman ? 0.96 : senior ? 0.95 : 1,
    lean = senior ? 0.07 : 0;
  const p = (x: number, y: number, z: number): Point => [x, y * height, z + lean * y];
  b.bar(shirt, p(0, 0.91, 0), p(0, 1.33, 0), woman ? 0.19 : 0.22);
  b.box("pants", p(0, 0.83, 0), [0.35, 0.19, 0.24], undefined, true);
  b.bar(skin, p(0, 1.38, 0), p(0, 1.52, 0), 0.067);
  b.ball(skin, p(0, 1.66, 0), [0.16, 0.205, 0.16]);
  b.ball(hair, p(0, 1.79, -0.025), [0.165, 0.095, 0.15]);
  if (woman) b.box("hair", p(0, 1.6, -0.135), [0.29, 0.32, 0.11], undefined, true);
  b.ball(skin, p(0, 1.65, 0.156), [0.035, 0.044, 0.036]);
  for (const side of [-1, 1]) {
    b.ball("dark", p(side * 0.057, 1.7, 0.151), [0.012, 0.012, 0.009]);
    const shoulder = p(side * 0.21, 1.32, 0),
      elbow = p(side * 0.28, 1.09, 0.02),
      hand = p(side * 0.28, 0.86, senior && side < 0 ? 0.18 : 0.04);
    b.bar(shirt, shoulder, elbow, 0.065);
    b.bar(shirt, elbow, hand, 0.054);
    b.ball(skin, hand, [0.06, 0.075, 0.055]);
    const hip = p(side * 0.105, 0.81, 0),
      knee = p(side * 0.11, 0.46, 0.025),
      ankle = p(side * 0.12, 0.15, 0);
    b.bar("pants", hip, knee, 0.074);
    b.bar("pants", knee, ankle, 0.062);
    b.box("rubber", p(side * 0.12, 0.07, 0.065), [0.17, 0.13, 0.29], undefined, true);
  }
  if (senior) {
    b.bar("trunk", p(-0.28, 0.87, 0.18), [-0.3, 0, 0.25], 0.018);
    b.bar("trunk", p(-0.33, 0.87, 0.18), p(-0.23, 0.87, 0.18), 0.022);
  }
  if (youth) {
    b.box("gold", p(0, 1.15, -0.21), [0.31, 0.4, 0.17], undefined, true);
    for (const side of [-1, 1])
      b.bar("dark", p(side * 0.14, 1.37, 0.12), p(side * 0.14, 0.96, 0.13), 0.016);
  }
  return b.finish();
}
export const CHARACTER_PARTS = [0, 1, 2, 3].map(person);
export function Character({ index }: { index: 0 | 1 | 2 | 3 }) {
  return <AssetParts parts={CHARACTER_PARTS[index]} />;
}

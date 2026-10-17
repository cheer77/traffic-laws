import { Batch, type InstanceTransform } from "../Primitives";
import { AssetParts } from "../AssetParts";
import { AssetBuilder, extrudedProfile } from "../vehicles/assetBuilder";

export const BUILDING_DIMENSIONS = [
  { height: 8.6, mat: "brick", width: 11, depth: 9 },
  { height: 11.5, mat: "stone", width: 9, depth: 11 },
  { height: 6.5, mat: "cream", width: 12, depth: 9 },
  { height: 4.8, mat: "cream", width: 10, depth: 11 },
] as const;
function building(index: number) {
  const { height, mat, width, depth } = BUILDING_DIMENSIONS[index],
    b = new AssetBuilder(),
    windows: InstanceTransform[] = [];
  b.box(mat, [0, height / 2, 0], [width, height, depth]);
  b.box("stone", [0, 0.23, 0], [width + 0.1, 0.46, depth + 0.1]);
  b.box("roof", [0, height + 0.12, 0], [width + 0.3, 0.24, depth + 0.3]);
  if (index === 3) {
    const roof = extrudedProfile(
      [
        [0, -depth / 2 - 0.3],
        [1.3, 0],
        [0, depth / 2 + 0.3],
      ],
      width + 0.6,
    );
    roof.translate(0, height + 0.22, 0);
    b.add("roof", roof);
  } else {
    for (const side of [-1, 1]) {
      b.box("curb", [(side * width) / 2, height + 0.35, 0], [0.16, 0.4, depth]);
      b.box("curb", [0, height + 0.35, (side * depth) / 2], [width, 0.4, 0.16]);
    }
    b.box("roof", [0, height + 0.5, 0], [2.1, 0.7, 1.6]);
  }
  const ww = index === 1 ? 1.55 : 1.2,
    wh = index === 1 ? 1.65 : 1.2;
  for (let y = 3.5; y < height - 0.65; y += index === 1 ? 2.35 : 2.1) {
    for (const side of [-1, 1]) {
      for (let x = -width / 2 + 1.5; x < width / 2 - 1; x += 2.2) {
        windows.push({ position: [x, y, side * (depth / 2 + 0.025)], scale: [ww, wh, 0.035] });
        b.box("curb", [x, y, side * (depth / 2 + 0.012)], [ww + 0.13, wh + 0.13, 0.024]);
        b.box("roof", [x, y, side * (depth / 2 + 0.048)], [0.045, wh, 0.015]);
        if (index === 0) {
          b.box("curb", [x, y - wh / 2 - 0.15, side * (depth / 2 + 0.3)], [1.6, 0.12, 0.65]);
          b.box("dark", [x, y - 0.14, side * (depth / 2 + 0.6)], [1.5, 0.035, 0.035]);
          for (const dx of [-0.7, 0, 0.7])
            b.box("dark", [x + dx, y - 0.4, side * (depth / 2 + 0.6)], [0.03, 0.55, 0.03]);
        }
      }
      for (let z = -depth / 2 + 1.5; z < depth / 2 - 1; z += 2.2) {
        windows.push({ position: [side * (width / 2 + 0.025), y, z], scale: [0.035, wh, ww] });
        b.box("curb", [side * (width / 2 + 0.012), y, z], [0.024, wh + 0.13, ww + 0.13]);
      }
    }
  }
  b.box("dark", [0, 1.17, depth / 2 + 0.025], [1.65, 2.34, 0.04]);
  b.box("glass", [0, 1.2, depth / 2 + 0.052], [1.45, 2.16, 0.018]);
  b.box("chrome", [0, 1.2, depth / 2 + 0.068], [0.06, 2.15, 0.02]);
  for (const side of [-1, 1])
    b.box("chrome", [side * 0.12, 1.1, depth / 2 + 0.09], [0.025, 0.31, 0.025]);
  b.box(
    index === 2 ? "teal" : "roof",
    [0, 2.6, depth / 2 + 0.45],
    [index === 2 ? width : 2.5, 0.13, 1.1],
  );
  if (index === 2 || index === 1)
    for (const side of [-1, 1]) {
      const windowWidth = index === 1 ? 2.1 : 2.8,
        windowCenter = index === 1 ? 3.05 : 3.4;
      b.box("dark", [side * windowCenter, 1.25, depth / 2 + 0.025], [windowWidth, 2.1, 0.04]);
      b.box(
        "glass",
        [side * windowCenter, 1.25, depth / 2 + 0.052],
        [windowWidth - 0.15, 1.95, 0.02],
      );
    }
  return { parts: b.finish(), windows };
}
export const BUILDING_PARTS = [0, 1, 2, 3].map(building);

const treeTrunks: InstanceTransform[] = [],
  roundCrowns: InstanceTransform[] = [],
  tallCrowns: InstanceTransform[] = [],
  bushes: InstanceTransform[] = [];
const treePositions = [
  [-9, -12],
  [-9, -23],
  [-26, -9],
  [10, -9],
  [25, -9],
  [10, -26],
  [-10, 10],
  [-10, 27],
  [-27, 10],
  [10, 12],
  [10, 26],
  [27, 10],
];
for (const [index, [x, z]] of treePositions.entries()) {
  const tall = index % 3 === 0,
    height = tall ? 4.05 : 3.25 + (index % 3) * 0.25;
  treeTrunks.push({ position: [x, 1.5, z], scale: [0.16, 2.68, 0.16] });
  (tall ? tallCrowns : roundCrowns).push({
    position: [x, height, z],
    scale: tall ? [1.1, 2.5, 1.15] : [1.65, 1.8, 1.45],
    rotation: [0, index * 0.71, 0.06 * (index % 2 ? 1 : -1)],
  });
  bushes.push({ position: [x + 1.8, 0.58, z + 1], scale: [1.1 + (index % 2) * 0.2, 0.42, 0.78] });
}
const furniture = new AssetBuilder();
for (const [x, z] of [
  [-7, -13],
  [7, 13],
  [-13, 7],
  [13, -7],
  [-7, -28],
  [7, 28],
]) {
  furniture.bar("dark", [x, 0.16, z], [x, 5.8, z], 0.055);
  furniture.box("dark", [x + (x > 0 ? -0.55 : 0.55), 5.8, z], [1.2, 0.08, 0.12]);
  furniture.box("white", [x + (x > 0 ? -0.9 : 0.9), 5.72, z], [0.56, 0.05, 0.28], undefined, true);
}
for (const [x, z] of [
  [-9, 17],
  [16, 9],
  [-16, -9],
]) {
  for (let slat = 0; slat < 3; slat++)
    furniture.box("trunk", [x, 0.65, z - 0.22 + slat * 0.22], [2.2, 0.09, 0.18]);
  for (const y of [0.9, 1.14]) furniture.box("trunk", [x, y, z - 0.35], [2.2, 0.18, 0.08]);
  for (const side of [-0.75, 0.75]) furniture.box("dark", [x + side, 0.4, z], [0.07, 0.48, 0.5]);
}
const furnitureParts = furniture.finish();

export function Building({ index }: { index: 0 | 1 | 2 | 3 }) {
  return (
    <>
      <AssetParts parts={BUILDING_PARTS[index].parts} />
      <Batch items={BUILDING_PARTS[index].windows} mat="glass" cast={false} />
    </>
  );
}
export function Greenery() {
  return (
    <group>
      <Batch items={treeTrunks} mat="trunk" shape="cylinder" />
      <Batch items={roundCrowns} mat="leaf" shape="foliage" />
      <Batch items={tallCrowns} mat="leafLight" shape="foliage" />
      <Batch items={bushes} mat="leafLight" shape="foliage" />
    </group>
  );
}
export function StreetFurniture() {
  return <AssetParts parts={furnitureParts} />;
}

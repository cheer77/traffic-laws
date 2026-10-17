import type { VehicleKind } from "../types/assets";
import { SphereGeometry } from "three";
import {
  AssetBuilder,
  bodyWithWells,
  cabin,
  extrudedProfile,
  panelPatch,
  sideFace,
  type CabinSpec,
  type Face,
  type GeometryPart,
  type Point,
  type WheelLayout,
  type WindowMount,
} from "./assetBuilder";
import type { MaterialName } from "../resources";

export interface LabelMount {
  text: "POLICE" | "AMBULANCE" | "FIRE RESCUE";
  face: Face;
  row: number;
}
export interface VehicleGeometry {
  parts: GeometryPart[];
  windows: WindowMount[];
  wheels: WheelLayout;
  labels: LabelMount[];
  length: number;
  halfWidth: number;
  beacon?: { roofY: number; z: number; width: number };
}

const carWheels: WheelLayout = {
  radius: 0.37,
  width: 0.25,
  track: 1,
  axles: [-1.36, 1.38],
  centerY: 0.37,
  clearance: 0.09,
};
const suvWheels: WheelLayout = {
  radius: 0.45,
  width: 0.27,
  track: 1.035,
  axles: [-1.43, 1.43],
  centerY: 0.45,
  clearance: 0.09,
};
const vanWheels: WheelLayout = {
  radius: 0.44,
  width: 0.28,
  track: 1.07,
  axles: [-1.77, 1.78],
  centerY: 0.44,
  clearance: 0.09,
};
const truckWheels: WheelLayout = {
  radius: 0.54,
  width: 0.32,
  track: 1.16,
  axles: [-2.25, -0.8, 2.15],
  centerY: 0.54,
  clearance: 0.09,
};
const bikeWheels: WheelLayout = {
  radius: 0.36,
  width: 0.18,
  track: 0,
  axles: [-0.83, 0.85],
  centerY: 0.36,
  clearance: 0.07,
};

function mirrors(
  builder: AssetBuilder,
  mat: MaterialName,
  spec: CabinSpec,
  halfWidth: number,
  y: number,
  z: number,
) {
  const fraction = (y - 0.03 - spec.baseY) / (spec.roofY - spec.baseY);
  const mountX = spec.baseHalfWidth + (spec.roofHalfWidth - spec.baseHalfWidth) * fraction - 0.003;
  for (const side of [-1, 1]) {
    builder.bar(
      "dark",
      [side * mountX, y - 0.03, z],
      [side * (halfWidth + 0.19), y - 0.01, z + 0.025],
      0.026,
    );
    builder.box(mat, [side * (halfWidth + 0.19), y, z + 0.04], [0.17, 0.13, 0.25], [0, 0, 0], true);
    builder.box("glass", [side * (halfWidth + 0.19), y, z - 0.088], [0.12, 0.085, 0.009]);
  }
}

function lightbar(builder: AssetBuilder, roofY: number, z: number, width: number) {
  builder.box("dark", [0, roofY + 0.037, z], [width, 0.074, 0.28], [0, 0, 0], true);
  for (const side of [-1, 1])
    builder.box(
      "blue",
      [side * width * 0.29, roofY + 0.125, z],
      [width * 0.37, 0.13, 0.24],
      [0, 0, 0],
      true,
    );
  builder.box("chrome", [0, roofY + 0.12, z], [width * 0.18, 0.09, 0.24]);
  return { roofY, z, width };
}

function grille(builder: AssetBuilder, width: number, y: number, z: number) {
  builder.box("dark", [0, y, z], [width, 0.2, 0.022]);
  for (const dy of [-0.055, 0, 0.055])
    builder.box("chrome", [0, y + dy, z + 0.014], [width * 0.87, 0.014, 0.014]);
}

function lighting(builder: AssetBuilder, length: number, halfWidth: number, y: number) {
  for (const side of [-1, 1]) {
    const x = side * halfWidth * 0.61;
    builder.box("dark", [x, y, length / 2 + 0.012], [0.42, 0.185, 0.045], [0, 0, 0], true);
    builder.box("headlight", [x, y, length / 2 + 0.038], [0.34, 0.115, 0.018], [0, 0, 0], true);
    builder.box("dark", [x, y - 0.03, -length / 2 - 0.012], [0.39, 0.17, 0.045], [0, 0, 0], true);
    builder.box("tail", [x, y - 0.03, -length / 2 - 0.038], [0.31, 0.105, 0.018], [0, 0, 0], true);
    for (const end of [-1, 1])
      builder.box(
        "amber",
        [side * (halfWidth - 0.1), y, end * (length / 2 + 0.028)],
        [0.115, 0.09, 0.035],
      );
  }
}

function carAsset(suv = false, police = false): VehicleGeometry {
  const builder = new AssetBuilder(),
    labels: LabelMount[] = [];
  const mat: MaterialName = police ? "white" : suv ? "sage" : "blue",
    wheels = suv ? suvWheels : carWheels;
  const length = suv ? 4.7 : 4.5,
    halfWidth = suv ? 1.035 : 1,
    top = suv ? 1.19 : 1.03;
  bodyWithWells(builder, mat, length, halfWidth * 2, suv ? 0.38 : 0.3, top, wheels);
  const cabSpec = suv
    ? {
        baseY: 1.16,
        roofY: 1.98,
        front: 1.12,
        rear: -1.82,
        roofFront: 0.45,
        roofRear: -1.17,
        baseHalfWidth: 0.98,
        roofHalfWidth: 0.84,
      }
    : {
        baseY: 1.01,
        roofY: 1.64,
        front: 1.08,
        rear: -1.43,
        roofFront: 0.38,
        roofRear: -0.81,
        baseHalfWidth: 0.94,
        roofHalfWidth: 0.77,
      };
  cabin(builder, mat, cabSpec, suv ? 3 : 2);
  for (const side of [-1, 1]) {
    const windshieldPoint = (u: number, v: number): Point => [
      (u * 2 - 1) * (cabSpec.baseHalfWidth + (cabSpec.roofHalfWidth - cabSpec.baseHalfWidth) * v),
      cabSpec.baseY + (cabSpec.roofY - cabSpec.baseY) * v + 0.006,
      cabSpec.front + (cabSpec.roofFront - cabSpec.front) * v + 0.009,
    ];
    builder.bar(
      "dark",
      windshieldPoint(side > 0 ? 0.55 : 0.18, 0.18),
      windshieldPoint(side > 0 ? 0.83 : 0.46, 0.28),
      0.009,
    );
  }
  const bumperZ = length / 2;
  builder.box("dark", [0, 0.4, bumperZ], [halfWidth * 1.84, 0.16, 0.13], [0, 0, 0], true);
  builder.box("dark", [0, 0.4, -bumperZ], [halfWidth * 1.87, 0.16, 0.13], [0, 0, 0], true);
  grille(builder, 0.88, 0.77, bumperZ + 0.008);
  builder.box("white", [0, 0.49, -bumperZ - 0.07], [0.39, 0.115, 0.015]);
  mirrors(builder, mat, cabSpec, halfWidth, suv ? 1.39 : 1.26, 0.67);
  lighting(builder, length, halfWidth, suv ? 1 : 0.81);
  for (const side of [-1, 1]) {
    for (const z of [-0.66, 0.52])
      builder.box("chrome", [side * (halfWidth + 0.004), top - 0.085, z], [0.022, 0.035, 0.19]);
    const seam = suv ? 0.07 : -0.17;
    builder.surface(
      "dark",
      panelPatch(sideFace(side, halfWidth, seam - 0.01, seam + 0.01, 0.34, top - 0.03), 0, 1, 0, 1),
    );
    if (suv) builder.box("dark", [side * 0.68, 2.025, -0.3], [0.045, 0.09, 1.57], [0, 0, 0], true);
    if (police) {
      const stripe = sideFace(side, halfWidth, -0.77, 0.79, 0.64, 0.99);
      builder.surface("police", panelPatch(stripe, 0, 1, 0, 1));
      labels.push({
        text: "POLICE",
        row: 0,
        face: panelPatch(stripe, 0.15, 0.85, 0.05, 0.92, 0.008),
      });
    }
  }
  let beacon: VehicleGeometry["beacon"];
  if (police) {
    const hood: Face = [
      [-0.83, top + 0.004, 2.04],
      [0.83, top + 0.004, 2.04],
      [0.83, top + 0.004, 1.19],
      [-0.83, top + 0.004, 1.19],
    ];
    builder.surface("police", hood);
    labels.push({ text: "POLICE", row: 0, face: panelPatch(hood, 0.09, 0.91, 0.2, 0.64) });
    beacon = lightbar(builder, 1.64, -0.12, 1.12);
  }
  return {
    parts: builder.finish(),
    windows: builder.windows,
    wheels,
    labels,
    length,
    halfWidth,
    beacon,
  };
}

function ambulanceAsset(): VehicleGeometry {
  const builder = new AssetBuilder(),
    labels: LabelMount[] = [],
    length = 5.8,
    halfWidth = 1.08;
  bodyWithWells(builder, "white", length, halfWidth * 2, 0.34, 1.13, vanWheels);
  builder.add(
    "white",
    extrudedProfile(
      [
        [1.09, -2.9],
        [2.51, -2.9],
        [2.65, -2.75],
        [2.65, 0.65],
        [2.53, 0.8],
        [1.09, 0.8],
      ],
      halfWidth * 2,
    ),
  );
  const cabSpec = {
    baseY: 1.1,
    roofY: 2.35,
    front: 2.8,
    rear: 0.8,
    roofFront: 1.9,
    roofRear: 0.8,
    baseHalfWidth: 1.04,
    roofHalfWidth: 0.92,
  };
  cabin(builder, "white", cabSpec, 1, false);
  builder.box("dark", [0, 0.48, 2.91], [2.02, 0.2, 0.14], [0, 0, 0], true);
  builder.box("dark", [0, 0.45, -2.91], [2.03, 0.18, 0.14], [0, 0, 0], true);
  grille(builder, 1.02, 0.89, 2.91);
  lighting(builder, length, halfWidth, 0.89);
  mirrors(builder, "white", cabSpec, 1.06, 1.59, 1.67);
  for (const side of [-1, 1]) {
    builder.surface(
      "gold",
      panelPatch(sideFace(side, halfWidth, -2.72, 0.67, 1.18, 1.37), 0, 1, 0, 1),
    );
    builder.surface(
      "teal",
      panelPatch(sideFace(side, halfWidth, -2.72, 0.67, 1.12, 1.16), 0, 1, 0, 1),
    );
    const panel = sideFace(side, halfWidth, -2.55, 0.48, 1.4, 2.5);
    labels.push({ text: "AMBULANCE", row: 1, face: panelPatch(panel, 0.12, 0.88, 0.56, 0.932) });
    const x = side * (halfWidth + 0.008),
      z = -1.0;
    builder.box("teal", [x, 1.7, z], [0.016, 0.52, 0.15]);
    builder.box("teal", [x, 1.7, z], [0.017, 0.15, 0.52]);
    builder.box("chrome", [side * 1.075, 1.25, 0.41], [0.019, 0.065, 0.22]);
  }
  const back: Face = [
    [halfWidth, 1.1, -2.9],
    [-halfWidth, 1.1, -2.9],
    [-halfWidth, 2.51, -2.9],
    [halfWidth, 2.51, -2.9],
  ];
  builder.window(back, 0.08, 0.44, 0.4, 0.86);
  builder.window(back, 0.56, 0.92, 0.4, 0.86);
  builder.box("chrome", [0, 1.8, -2.908], [0.016, 1.36, 0.014]);
  labels.push({
    text: "AMBULANCE",
    row: 1,
    face: panelPatch(back, 0.09, 0.91, 0.08, 0.303, 0.008),
  });
  const beacon = lightbar(builder, 2.65, 0.16, 1.28);
  return {
    parts: builder.finish(),
    windows: builder.windows,
    wheels: vanWheels,
    labels,
    length,
    halfWidth,
    beacon,
  };
}

function fireAsset(): VehicleGeometry {
  const builder = new AssetBuilder(),
    labels: LabelMount[] = [],
    length = 7,
    halfWidth = 1.18;
  bodyWithWells(builder, "red", length, halfWidth * 2, 0.39, 1.34, truckWheels);
  builder.add(
    "red",
    extrudedProfile(
      [
        [1.28, -3.4],
        [2.17, -3.4],
        [2.29, -3.28],
        [2.29, 0.5],
        [2.2, 0.64],
        [1.28, 0.64],
      ],
      halfWidth * 2,
    ),
  );
  const cabSpec = {
    baseY: 1.28,
    roofY: 2.61,
    front: 3.4,
    rear: 0.64,
    roofFront: 2.65,
    roofRear: 0.64,
    baseHalfWidth: 1.145,
    roofHalfWidth: 1.02,
  };
  cabin(builder, "red", cabSpec, 2, false);
  mirrors(builder, "red", cabSpec, 1.16, 1.82, 2.66);
  builder.box("chrome", [0, 0.67, 3.5], [2.19, 0.21, 0.13], [0, 0, 0], true);
  builder.box("dark", [0, 0.57, -3.5], [2.2, 0.2, 0.13], [0, 0, 0], true);
  grille(builder, 1.18, 1.02, 3.51);
  lighting(builder, length, halfWidth, 1.12);
  for (const side of [-1, 1]) {
    const panel = sideFace(side, halfWidth, -3.23, 0.46, 1.37, 2.19);
    labels.push({
      text: "FIRE RESCUE",
      row: 2,
      face: panelPatch(panel, 0.23, 0.77, 0.57, 0.97, 0.008),
    });
    for (let index = 0; index < 3; index++) {
      const u = index / 3 + 0.025;
      builder.surface("chrome", panelPatch(panel, u, u + 0.29, 0.03, 0.54));
      for (let row = 0; row < 5; row++)
        builder.surface(
          "roof",
          panelPatch(panel, u, u + 0.29, 0.08 + row * 0.09, 0.09 + row * 0.09, 0.005),
        );
    }
    builder.surface(
      "white",
      panelPatch(sideFace(side, halfWidth, -3.25, 3.25, 1.2, 1.27), 0, 1, 0, 1),
    );
    builder.box("chrome", [side * 0.58, 2.42, -1.35], [0.07, 0.08, 3.72]);
    for (const z of [-2.48, -0.05]) builder.box("dark", [side * 0.58, 2.34, z], [0.17, 0.12, 0.18]);
  }
  for (let index = 0; index < 10; index++)
    builder.box("chrome", [0, 2.42, -3.08 + index * 0.39], [1.16, 0.047, 0.054]);
  const back: Face = [
    [halfWidth, 1.3, -3.4],
    [-halfWidth, 1.3, -3.4],
    [-halfWidth, 2.17, -3.4],
    [halfWidth, 2.17, -3.4],
  ];
  labels.push({ text: "FIRE RESCUE", row: 2, face: panelPatch(back, 0.08, 0.92, 0.46, 0.835) });
  const beacon = lightbar(builder, 2.61, 1.65, 1.42);
  return {
    parts: builder.finish(),
    windows: builder.windows,
    wheels: truckWheels,
    labels,
    length,
    halfWidth,
    beacon,
  };
}

function motorcycleAsset(): VehicleGeometry {
  const builder = new AssetBuilder();
  builder.bar("dark", [0, 0.49, -0.8], [0, 0.66, 0.15], 0.055);
  for (const side of [-1, 1]) {
    builder.bar(
      "chrome",
      [side * 0.14, bikeWheels.centerY, 0.85],
      [side * 0.14, 1.31, 0.53],
      0.032,
    );
    builder.bar(
      "dark",
      [side * 0.12, bikeWheels.centerY, -0.83],
      [side * 0.13, 0.93, -0.34],
      0.035,
    );
    builder.bar("dark", [side * 0.34, 0.47, -0.18], [side * 0.14, 0.55, -0.18], 0.025);
  }
  builder.box("chrome", [0, 0.61, -0.03], [0.45, 0.43, 0.46], [0, 0, 0], true);
  builder.ball("gold", [0, 0.95, 0.13], [0.28, 0.25, 0.39]);
  builder.box("rubber", [0, 1.08, -0.48], [0.44, 0.15, 0.73], [0, 0, 0], true);
  builder.bar("dark", RIDER_POINTS.rightGrip, RIDER_POINTS.leftGrip, 0.03);
  for (const side of [-1, 1]) {
    builder.bar("chrome", [side * 0.3, 1.35, 0.52], [side * 0.43, 1.57, 0.57], 0.014);
    builder.box("dark", [side * 0.43, 1.6, 0.57], [0.19, 0.12, 0.055], [0, side * 0.16, 0], true);
    builder.box("glass", [side * 0.43, 1.6, 0.537], [0.145, 0.077, 0.009], [0, side * 0.16, 0]);
  }
  builder.bar("chrome", [0, 1.31, 0.53], [0, 0.92, 0.65], 0.04);
  builder.bar("chrome", [-0.28, 0.34, -0.72], [-0.28, 0.38, -0.12], 0.065);
  builder.box("tail", [0, 1.02, -0.95], [0.24, 0.09, 0.04]);
  builder.box("headlight", [0, 1.13, 0.79], [0.27, 0.23, 0.08], [0.18, 0, 0], true);
  for (const axle of bikeWheels.axles) {
    const points: Array<[number, number]> = [];
    for (let step = 0; step <= 12; step++) {
      const angle = (step / 12) * Math.PI;
      points.push([bikeWheels.centerY + 0.425 * Math.sin(angle), axle + 0.425 * Math.cos(angle)]);
    }
    for (let step = 12; step >= 0; step--) {
      const angle = (step / 12) * Math.PI;
      points.push([bikeWheels.centerY + 0.399 * Math.sin(angle), axle + 0.399 * Math.cos(angle)]);
    }
    builder.add("gold", extrudedProfile(points, 0.23));
  }
  return {
    parts: builder.finish(),
    windows: [],
    wheels: bikeWheels,
    labels: [],
    length: 2.2,
    halfWidth: 0.35,
  };
}

export const RIDER_POINTS = {
  hip: [0, 1.26, -0.45] as Point,
  shoulders: [0, 1.82, -0.18] as Point,
  helmet: [0, 2.15, -0.09] as Point,
  leftGrip: [0.35, 1.35, 0.52] as Point,
  rightGrip: [-0.35, 1.35, 0.52] as Point,
};

function riderGeometry(): GeometryPart[] {
  const builder = new AssetBuilder();
  builder.box("pants", RIDER_POINTS.hip, [0.39, 0.23, 0.31], [0.12, 0, 0], true);
  builder.bar("riderJacket", [0, 1.36, -0.4], RIDER_POINTS.shoulders, 0.225);
  builder.bar("skin", [0, 1.86, -0.12], [0, 2.04, -0.09], 0.075);
  builder.ball("helmet", RIDER_POINTS.helmet, [0.235, 0.265, 0.24]);
  for (const side of [-1, 1]) {
    const shoulder: Point = [side * 0.22, 1.82, -0.18],
      elbow: Point = [side * 0.35, 1.57, 0.12],
      hand = side > 0 ? RIDER_POINTS.leftGrip : RIDER_POINTS.rightGrip;
    builder.bar("riderJacket", shoulder, elbow, 0.085);
    builder.ball("riderJacket", elbow, [0.085, 0.085, 0.085]);
    builder.bar("riderJacket", elbow, hand, 0.068);
    builder.ball("rubber", hand, [0.072, 0.07, 0.085]);
    const hip: Point = [side * 0.16, 1.25, -0.45],
      knee: Point = [side * 0.4, 0.91, 0.03],
      ankle: Point = [side * 0.34, 0.5, -0.22];
    builder.bar("pants", hip, knee, 0.1);
    builder.ball("pants", knee, [0.102, 0.1, 0.1]);
    builder.bar("pants", knee, ankle, 0.08);
    builder.box("rubber", [side * 0.34, 0.46, -0.12], [0.18, 0.16, 0.33], [0, 0, 0], true);
  }
  // Визор — участок поверхности шлема, а не отдельный висящий прямоугольник.
  const visor = new SphereGeometry(1, 12, 4, 0, Math.PI, Math.PI * 0.36, Math.PI * 0.27);
  visor.scale(0.239, 0.269, 0.244);
  visor.translate(...RIDER_POINTS.helmet);
  builder.add("vehicleGlass", visor);
  return builder.finish();
}

export const VEHICLE_GEOMETRY: Record<VehicleKind, VehicleGeometry> = {
  sedan: carAsset(),
  suv: carAsset(true),
  police: carAsset(false, true),
  ambulance: ambulanceAsset(),
  fire: fireAsset(),
  motorcycle: motorcycleAsset(),
};
export const RIDER_GEOMETRY = riderGeometry();

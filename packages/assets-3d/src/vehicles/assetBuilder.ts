import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { geometry, type MaterialName } from "../resources";
import { RoundedBoxGeometry } from "three-stdlib";

export type Point = readonly [number, number, number];
export type Face = readonly [Point, Point, Point, Point];
export interface GeometryPart {
  material: MaterialName;
  geometry: THREE.BufferGeometry;
}
export interface WindowMount {
  host: Face;
  vertices: Face;
  offset: number;
}
export const SURFACE_OFFSET = 0.004;
export const VEHICLE_ROUNDED = new RoundedBoxGeometry(1, 1, 1, 1, 0.08);

export function faceNormal(face: Face) {
  const origin = new THREE.Vector3(...face[0]);
  return new THREE.Vector3(...face[1])
    .sub(origin)
    .cross(new THREE.Vector3(...face[3]).sub(origin))
    .normalize();
}

export function quad(
  face: Face,
  uvBounds: readonly [number, number, number, number] = [0, 0, 1, 1],
) {
  const vertices = [...face[0], ...face[1], ...face[2], ...face[0], ...face[2], ...face[3]];
  const [u0, v0, u1, v1] = uvBounds;
  const result = new THREE.BufferGeometry();
  result.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2),
  );
  result.computeVertexNormals();
  return result;
}

export function panelPatch(
  face: Face,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  offset = SURFACE_OFFSET,
): Face {
  const normal = faceNormal(face);
  const point = (u: number, v: number): Point => {
    const bottom = new THREE.Vector3(...face[0]).lerp(new THREE.Vector3(...face[1]), u);
    const top = new THREE.Vector3(...face[3]).lerp(new THREE.Vector3(...face[2]), u);
    return bottom.lerp(top, v).addScaledVector(normal, offset).toArray();
  };
  return [point(u0, v0), point(u1, v0), point(u1, v1), point(u0, v1)];
}

export function sideFace(
  side: number,
  halfWidth: number,
  rear: number,
  front: number,
  bottom: number,
  top: number,
): Face {
  const a: Point = [side * halfWidth, bottom, side > 0 ? front : rear];
  const b: Point = [side * halfWidth, bottom, side > 0 ? rear : front];
  return [a, b, [b[0], top, b[2]], [a[0], top, a[2]]];
}

export class AssetBuilder {
  private pieces = new Map<MaterialName, THREE.BufferGeometry[]>();
  readonly windows: WindowMount[] = [];
  add(mat: MaterialName, piece: THREE.BufferGeometry) {
    const normalized = piece.index ? piece.toNonIndexed() : piece;
    if (normalized !== piece) piece.dispose();
    const list = this.pieces.get(mat) ?? [];
    list.push(normalized);
    this.pieces.set(mat, list);
  }
  box(
    mat: MaterialName,
    position: Point,
    scale: Point,
    rotation: Point = [0, 0, 0],
    rounded = false,
  ) {
    const piece = (rounded ? VEHICLE_ROUNDED : geometry.box).clone();
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    this.add(mat, piece.applyMatrix4(matrix));
  }
  ball(mat: MaterialName, position: Point, scale: Point) {
    const piece = geometry.sphere.clone();
    piece.scale(...scale);
    piece.translate(...position);
    this.add(mat, piece);
  }
  bar(mat: MaterialName, from: Point, to: Point, radius: number) {
    const start = new THREE.Vector3(...from),
      end = new THREE.Vector3(...to),
      direction = end.clone().sub(start);
    const piece = new THREE.CylinderGeometry(radius, radius, direction.length(), 8);
    piece.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
    );
    piece.translate(...start.add(end).multiplyScalar(0.5).toArray());
    this.add(mat, piece);
  }
  surface(mat: MaterialName, face: Face) {
    this.add(mat, quad(face));
  }
  window(face: Face, u0 = 0.09, u1 = 0.91, v0 = 0.14, v1 = 0.88) {
    // Seal follows the same plane; glass sits 2 mm above the rubber surround.
    this.surface("rubber", panelPatch(face, u0 - 0.014, u1 + 0.014, v0 - 0.018, v1 + 0.018, 0.002));
    const vertices = panelPatch(face, u0, u1, v0, v1);
    this.windows.push({ host: face, vertices, offset: SURFACE_OFFSET });
    this.surface("vehicleGlass", vertices);
  }
  finish(): GeometryPart[] {
    return [...this.pieces].map(([mat, pieces]) => {
      const merged = mergeGeometries(pieces);
      pieces.forEach((piece) => piece.dispose());
      merged.computeBoundingSphere();
      return { material: mat, geometry: merged };
    });
  }
}

// Профиль задан непосредственно координатами y/z автомобиля; направление +z — вперёд.
export function extrudedProfile(points: ReadonlyArray<readonly [number, number]>, width: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-points[0][1], points[0][0]);
  for (const [y, z] of points.slice(1)) shape.lineTo(-z, y);
  shape.closePath();
  const result = new THREE.ExtrudeGeometry(shape, { depth: width, steps: 1, bevelEnabled: false });
  result.rotateY(Math.PI / 2);
  result.translate(-width / 2, 0, 0);
  return result;
}

export interface WheelLayout {
  radius: number;
  width: number;
  track: number;
  axles: number[];
  centerY: number;
  clearance: number;
}

export function bodyWithWells(
  builder: AssetBuilder,
  mat: MaterialName,
  length: number,
  width: number,
  bottom: number,
  top: number,
  wheels: WheelLayout,
) {
  const points: Array<[number, number]> = [[bottom, -length / 2 + 0.1]];
  for (const z of [...wheels.axles].sort((a, b) => a - b)) {
    const radius = wheels.radius + wheels.clearance;
    points.push([bottom, z - radius], [wheels.centerY, z - radius]);
    for (let step = 1; step <= 12; step++) {
      const angle = Math.PI - (step / 12) * Math.PI;
      points.push([wheels.centerY + Math.sin(angle) * radius, z + Math.cos(angle) * radius]);
    }
    points.push([bottom, z + radius]);
  }
  points.push(
    [bottom, length / 2 - 0.1],
    [bottom + 0.12, length / 2],
    [top - 0.12, length / 2],
    [top, length / 2 - 0.17],
    [top, -length / 2 + 0.17],
    [top - 0.1, -length / 2],
    [bottom + 0.1, -length / 2],
  );
  builder.add(mat, extrudedProfile(points, width));
  for (const side of [-1, 1])
    for (const axle of wheels.axles) {
      const inner = wheels.radius + wheels.clearance + 0.003,
        outer = inner + 0.035;
      for (let step = 0; step < 12; step++) {
        const a = (step / 12) * Math.PI,
          b = ((step + 1) / 12) * Math.PI;
        const p = (radius: number, angle: number): Point => [
          side * (width / 2 + 0.003),
          wheels.centerY + Math.sin(angle) * radius,
          axle + Math.cos(angle) * radius,
        ];
        const face: Face = [p(inner, a), p(outer, a), p(outer, b), p(inner, b)];
        builder.surface("dark", side > 0 ? [face[3], face[2], face[1], face[0]] : face);
      }
    }
}

export interface CabinSpec {
  baseY: number;
  roofY: number;
  front: number;
  rear: number;
  roofFront: number;
  roofRear: number;
  baseHalfWidth: number;
  roofHalfWidth: number;
}
export function cabin(
  builder: AssetBuilder,
  mat: MaterialName,
  spec: CabinSpec,
  sideWindows = 2,
  rearWindow = true,
) {
  const {
    baseY: y,
    roofY: h,
    front: f,
    rear: r,
    roofFront: tf,
    roofRear: tr,
    baseHalfWidth: w,
    roofHalfWidth: tw,
  } = spec;
  const front: Face = [
    [-w, y, f],
    [w, y, f],
    [tw, h, tf],
    [-tw, h, tf],
  ];
  const back: Face = [
    [w, y, r],
    [-w, y, r],
    [-tw, h, tr],
    [tw, h, tr],
  ];
  const roof: Face = [
    [-tw, h, tf],
    [tw, h, tf],
    [tw, h, tr],
    [-tw, h, tr],
  ];
  builder.surface(mat, front);
  builder.surface(mat, back);
  builder.surface(mat, roof);
  builder.window(front);
  if (rearWindow) builder.window(back, 0.11, 0.89, 0.18, 0.84);
  for (const side of [-1, 1]) {
    const face: Face =
      side > 0
        ? [
            [w, y, f],
            [w, y, r],
            [tw, h, tr],
            [tw, h, tf],
          ]
        : [
            [-w, y, r],
            [-w, y, f],
            [-tw, h, tf],
            [-tw, h, tr],
          ];
    builder.surface(mat, face);
    for (let index = 0; index < sideWindows; index++) {
      const start = 0.07 + (index * 0.86) / sideWindows,
        end = 0.07 + ((index + 1) * 0.86) / sideWindows - 0.035;
      builder.window(face, start, end, 0.16, 0.87);
    }
  }
  return { front, back, roof };
}

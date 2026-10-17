import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

function createRim() {
  const pieces: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const ring = new THREE.TorusGeometry(0.66, 0.055, 4, 20);
    ring.rotateY(Math.PI / 2);
    ring.translate(side * 0.54, 0, 0);
    pieces.push(ring);
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.BoxGeometry(0.035, 1.22, 0.09);
      spoke.rotateX((i * Math.PI) / 5);
      spoke.translate(side * 0.54, 0, 0);
      pieces.push(spoke);
    }
  }
  const hub = new THREE.CylinderGeometry(0.18, 0.18, 1.1, 12);
  hub.rotateZ(Math.PI / 2);
  pieces.push(hub);
  const result = mergeGeometries(pieces);
  pieces.forEach((piece) => piece.dispose());
  return result;
}

// Общие ресурсы не создаются повторно при переключении объектов и качества.
export const geometry = {
  box: new THREE.BoxGeometry(1, 1, 1),
  rounded: new RoundedBoxGeometry(1, 1, 1, 2, 0.08),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
  sphere: new THREE.SphereGeometry(1, 12, 8),
  foliage: new THREE.IcosahedronGeometry(1, 1),
  tire: new THREE.LatheGeometry(
    [
      [0.65, -0.5],
      [0.84, -0.5],
      [1, -0.26],
      [1, 0.26],
      [0.84, 0.5],
      [0.65, 0.5],
      [0.65, -0.5],
    ].map(([radius, y]) => new THREE.Vector2(radius, y)),
    16,
  ),
  rim: createRim(),
  ring: new THREE.TorusGeometry(1, 0.075, 6, 24),
};
const standard = (color: string, roughness = 0.7, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
export const material = {
  asphalt: standard("#46525a", 0.96),
  ground: standard("#b3c3b1"),
  paving: standard("#d9d8cf"),
  curb: standard("#ecebe1"),
  white: standard("#f1eee3", 0.48),
  dark: standard("#243039"),
  rubber: standard("#182027", 0.94),
  glass: standard("#334c59", 0.24, 0.3),
  chrome: standard("#b7c5c9", 0.3, 0.75),
  black: standard("#101b22"),
  blue: standard("#3b78b4", 0.29, 0.35),
  sage: standard("#71867c", 0.35, 0.3),
  red: standard("#bd4d3b", 0.35, 0.3),
  gold: standard("#e7ac46", 0.34, 0.25),
  police: standard("#28485c", 0.4),
  leaf: standard("#608c66"),
  leafLight: standard("#80a16c"),
  trunk: standard("#7f6954"),
  brick: standard("#b9977b"),
  cream: standard("#d9d2bc"),
  stone: standard("#9baeb1"),
  roof: standard("#727d7b"),
  skin: standard("#d0a17d"),
  skinDark: standard("#966e55"),
  pants: standard("#33434e"),
  shirt: standard("#c87a59"),
  teal: standard("#547c7b"),
  hair: standard("#473d35"),
  headlight: new THREE.MeshStandardMaterial({
    color: "#fff6d8",
    emissive: "#fff1bc",
    emissiveIntensity: 0.8,
    roughness: 0.2,
  }),
  tail: new THREE.MeshStandardMaterial({
    color: "#a82c35",
    emissive: "#8b1e2d",
    emissiveIntensity: 0.4,
  }),
  amber: standard("#885a25", 0.35),
  signRed: standard("#bd3d3d"),
  signYellow: standard("#f0c94e"),
  signal: new THREE.MeshStandardMaterial({
    color: "#ffb52f",
    emissive: "#ff9a13",
    emissiveIntensity: 1.8,
    toneMapped: false,
  }),
  beacon: new THREE.MeshStandardMaterial({
    color: "#5bb4ff",
    emissive: "#1685ed",
    emissiveIntensity: 2,
    toneMapped: false,
  }),
  trafficGreen: new THREE.MeshStandardMaterial({
    color: "#48ad74",
    emissive: "#248450",
    emissiveIntensity: 0.8,
  }),
  trafficRed: new THREE.MeshStandardMaterial({
    color: "#df473b",
    emissive: "#e63020",
    emissiveIntensity: 1,
    toneMapped: false,
  }),
  trafficAmber: new THREE.MeshStandardMaterial({
    color: "#ffbf40",
    emissive: "#ffaa15",
    emissiveIntensity: 1,
    toneMapped: false,
  }),
  vehicleGlass: standard("#2d4957", 0.21, 0.28),
  riderJacket: standard("#4c6269", 0.82),
  helmet: standard("#c2c9be", 0.45),
};
export type MaterialName = keyof typeof material;
for (const [name, value] of Object.entries(material)) value.name = name;

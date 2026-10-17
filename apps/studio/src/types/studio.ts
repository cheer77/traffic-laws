import type { VehicleKind } from "@traffic-laws/assets-3d/types";
export type { VehicleKind, Signal } from "@traffic-laws/assets-3d/types";
export type CameraMode = "free" | "top" | "iso" | "focus";
export type Quality = "low" | "medium" | "high";
export type Layer = "characters" | "buildings" | "trees" | "signs" | "lights";
export interface VehicleAsset {
 id: VehicleKind;
 name: string;
 category: string;
 color: string;
 position: [number, number, number];
 rotation: number;
 length: number;
}
export type TrafficSignal="junction"|"red"|"yellow"|"green"|"off";
export type DebugFlag="bounds"|"axes"|"lanes"|"wireframe"|"lightHelpers";
export interface Inspection {id:string;position:number[];rotation:number[];scale:number[];min:number[];max:number[];size:number[];triangles:number;geometries:number;materials:string[];}
export interface RenderMetrics { fps: number; frameTime: number; calls: number; triangles: number; geometries?:number;textures?:number;cpuTime?:number; }

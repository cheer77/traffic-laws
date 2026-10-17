export type VehicleKind = "sedan" | "suv" | "motorcycle" | "ambulance" | "police" | "fire";
export type Signal = "off" | "left" | "right" | "hazard";
export interface VehicleAnimation {
  wheelPreview: boolean;
  signal: Signal;
  beacon: boolean;
}

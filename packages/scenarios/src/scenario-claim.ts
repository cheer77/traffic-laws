/** Structured answer claim checked against the bounded traffic analysis. */
export type ScenarioClaim =
  | { kind: "yield"; fromVehicleId: string; toVehicleId: string; affirmativeAnswerId: string }
  | { kind: "prohibited"; vehicleId: string; affirmativeAnswerId: string };

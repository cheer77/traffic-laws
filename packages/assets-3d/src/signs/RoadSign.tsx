import { AssetParts } from "../AssetParts";
import { SIGN_PARTS } from "./signAssets";
export function RoadSign({ kind }: { kind: keyof typeof SIGN_PARTS }) {
  return <AssetParts parts={SIGN_PARTS[kind]} />;
}

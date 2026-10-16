import { material } from "./resources";
import type { GeometryPart } from "./vehicles/assetBuilder";

export function AssetParts({parts}:{parts:GeometryPart[]}){
 return <>{parts.map(part=><mesh key={part.material} geometry={part.geometry} material={material[part.material]} castShadow receiveShadow dispose={null}/>)}</>;
}

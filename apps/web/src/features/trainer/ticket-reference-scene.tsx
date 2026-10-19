import { Box, type InstanceTransform } from "@traffic-laws/assets-3d/Primitives";

export type ReconstructedTicketNumber = 1 | 4 | 5 | 6 | 8;

export function isReconstructedTicket(number: number): number is ReconstructedTicketNumber {
  return number === 1 || number === 4 || number === 5 || number === 6 || number === 8;
}

interface RoadReference {
  verticalWidth: number;
  horizontalWidth: number;
  markings: InstanceTransform[];
}

const line = (
  position: [number, number, number],
  scale: [number, number, number],
): InstanceTransform => ({ position, scale });

const verticalDashes = (x: number, starts: number[]): InstanceTransform[] =>
  starts.flatMap((z) => [line([x, 0.035, z], [0.11, 0.025, 2.4])]);
const horizontalDashes = (z: number, starts: number[]): InstanceTransform[] =>
  starts.flatMap((x) => [line([x, 0.035, z], [2.4, 0.025, 0.11])]);

const COMMON_DASHES = [-27, -21, -15, 15, 21, 27];
const ROAD_REFERENCES: Record<ReconstructedTicketNumber, RoadReference> = {
  1: {
    verticalWidth: 11.2,
    horizontalWidth: 10,
    markings: [
      ...verticalDashes(0, COMMON_DASHES),
      ...horizontalDashes(0, COMMON_DASHES),
      line([0, 0.04, 10], [10.7, 0.028, 0.28]),
      line([0, 0.04, -10], [10.7, 0.028, 0.28]),
      line([10.6, 0.04, 0], [0.28, 0.028, 9.5]),
      line([-10.6, 0.04, 0], [0.28, 0.028, 9.5]),
    ],
  },
  4: {
    verticalWidth: 10,
    horizontalWidth: 10,
    markings: [
      ...verticalDashes(0, COMMON_DASHES),
      ...horizontalDashes(0, COMMON_DASHES),
      line([-2.5, 0.04, -9.2], [4.6, 0.028, 0.3]),
      line([2.5, 0.04, 9.2], [4.6, 0.028, 0.3]),
      line([9.2, 0.04, -2.5], [0.3, 0.028, 4.6]),
      line([-9.2, 0.04, 2.5], [0.3, 0.028, 4.6]),
    ],
  },
  5: {
    verticalWidth: 10,
    horizontalWidth: 10,
    markings: [
      ...verticalDashes(0, [-27, -21, -15, 15, 21, 27]),
      ...horizontalDashes(0, [-27, -21, -15, 15, 21, 27]),
      line([2.5, 0.04, 9.4], [4.6, 0.028, 0.3]),
      line([2.5, 0.04, -9.4], [4.6, 0.028, 0.3]),
      line([-2.5, 0.04, -7.2], [4.6, 0.028, 0.26]),
      line([-4.65, 0.04, -5.9], [0.26, 0.028, 2.8]),
    ],
  },
  6: {
    verticalWidth: 10,
    horizontalWidth: 10,
    markings: [
      ...verticalDashes(0, [-27, -21, -15, 15, 21, 27]),
      ...horizontalDashes(0, [-27, -21, -15, 15, 21, 27]),
      line([2.5, 0.04, 9.4], [4.6, 0.028, 0.3]),
      line([-9.4, 0.04, -2.5], [0.3, 0.028, 4.6]),
      line([-7.9, 0.04, -2.5], [0.3, 0.028, 4.6]),
      line([-6.5, 0.04, -4.65], [2.8, 0.028, 0.26]),
    ],
  },
  8: {
    verticalWidth: 12,
    horizontalWidth: 10,
    markings: [
      ...verticalDashes(0, COMMON_DASHES),
      ...horizontalDashes(0, COMMON_DASHES),
      line([3, 0.04, 10], [5.5, 0.028, 0.3]),
      line([-10.8, 0.04, 2.5], [0.3, 0.028, 4.6]),
      line([-3, 0.04, -10], [5.5, 0.028, 0.3]),
    ],
  },
};

export const REFERENCE_CAMERAS: Record<
  ReconstructedTicketNumber,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  1: { position: [16, 48, 29], target: [0, 0, 3] },
  4: { position: [20, 47, 25], target: [0, 0, 0] },
  5: { position: [13, 50, 28], target: [0, 0, -1] },
  6: { position: [20, 48, 24], target: [-1, 0, 0] },
  8: { position: [14, 50, 27], target: [0, 0, 0] },
};

/** Web-only reconstruction geometry measured from the supplied official 2D references. */
export function TicketReferenceRoad({ ticket }: { ticket: ReconstructedTicketNumber }) {
  const reference = ROAD_REFERENCES[ticket];
  const cornerWidth = (70 - reference.verticalWidth) / 2;
  const cornerDepth = (70 - reference.horizontalWidth) / 2;
  return (
    <group name={`official-reference-road-${ticket}`}>
      <Box position={[0, -0.48, 0]} scale={[72, 0.8, 72]} mat="ground" rounded />
      <Box position={[0, -0.08, 0]} scale={[reference.verticalWidth, 0.18, 70]} mat="asphalt" />
      <Box position={[0, -0.079, 0]} scale={[70, 0.18, reference.horizontalWidth]} mat="asphalt" />
      {([-1, 1] as const).flatMap((x) =>
        ([-1, 1] as const).map((z) => (
          <group key={`${x}-${z}`}>
            <Box
              position={[
                x * (reference.verticalWidth / 2 + cornerWidth / 2),
                0.03,
                z * (reference.horizontalWidth / 2 + cornerDepth / 2),
              ]}
              scale={[cornerWidth - 0.35, 0.2, cornerDepth - 0.35]}
              mat="paving"
            />
            <Box
              position={[
                x * (reference.verticalWidth / 2 + cornerWidth / 2 + 1.3),
                0.15,
                z * (reference.horizontalWidth / 2 + cornerDepth / 2 + 1.3),
              ]}
              scale={[cornerWidth - 3, 0.08, cornerDepth - 3]}
              mat="ground"
            />
          </group>
        )),
      )}
      {reference.markings.map((marking, index) => (
        <Box key={index} {...marking} mat="white" cast={false} />
      ))}
    </group>
  );
}

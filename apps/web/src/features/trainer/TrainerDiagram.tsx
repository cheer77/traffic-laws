"use client";
import { useEffect, useId, useRef, type RefObject } from "react";
import { ROAD } from "@traffic-laws/assets-3d/roads/roadGeometry";
import { advancePlayback, sampleMotion, type Playback } from "./motion";
import { durationOf, signalAt, type TrainingScenario } from "./scenarios";
import { diagramPath, diagramTransform } from "./diagram";

const APPROACHES = ["south", "east", "north", "west"] as const;
const COLORS = { off: "#44504a", red: "#f44846", yellow: "#ffd43b", green: "#54e589" };
export default function TrainerDiagram({
  scenario,
  playback,
  selected,
  onSelect,
  playing,
  onFinished,
}: {
  scenario: TrainingScenario;
  playback: RefObject<Playback>;
  selected: string;
  onSelect: (id: string) => void;
  playing: boolean;
  onFinished: () => void;
}) {
  const root = useRef<SVGSVGElement>(null);
  const markerId = useId().replaceAll(":", "");
  useEffect(() => {
    const svg = root.current;
    if (!svg) return;
    const cars = scenario.cars.map((car) => ({
      car,
      node: svg.querySelector<SVGGElement>(`[data-car="${car.id}"]`),
      indicator: svg.querySelector<SVGGElement>(`[data-indicator="${car.id}"]`),
    }));
    const signals = APPROACHES.map((approach) => ({
      approach,
      node: svg.querySelector<SVGCircleElement>(`[data-signal="${approach}"]`),
    }));
    const pose = { x: 0, z: 0, yaw: 0 };
    const paint = () => {
      const time = playback.current.time;
      for (const { car, node, indicator } of cars) {
        node?.setAttribute("transform", diagramTransform(sampleMotion(car, time, pose)));
        indicator?.setAttribute(
          "visibility",
          car.maneuver !== "straight" && time < car.release + 9 && Math.floor(time / 0.4) % 2 === 0
            ? "visible"
            : "hidden",
        );
      }
      for (const { approach, node } of signals) {
        const signal = signalAt(scenario, approach, time);
        node?.setAttribute("fill", COLORS[signal]);
        node?.setAttribute(
          "aria-label",
          signal === "red"
            ? "Червоний"
            : signal === "yellow"
              ? "Жовтий"
              : signal === "green"
                ? "Зелений"
                : "Вимкнено",
        );
      }
    };
    paint();
    let frame = 0;
    let previous: number | null = null;
    const tick = (now: number) => {
      const wasRunning = playback.current.running;
      advancePlayback(
        playback.current,
        previous === null ? 0 : (now - previous) / 1000,
        durationOf(scenario),
      );
      previous = now;
      paint();
      if (wasRunning && !playback.current.running) onFinished();
      if (playback.current.running) frame = requestAnimationFrame(tick);
    };
    if (playing) frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scenario, playback, playing, onFinished]);
  return (
    <svg
      ref={root}
      className="trainer-diagram"
      viewBox="-35 -35 70 70"
      aria-label="Інтерактивна навчальна схема перехрестя"
      role="group"
    >
      <title>{`${scenario.title} — навчальна схема, не офіційне екзаменаційне зображення`}</title>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10Z" fill="context-stroke" />
        </marker>
      </defs>
      <rect x="-35" y="-35" width="70" height="70" fill="#e9eee3" />
      <path d="M-33 0H33M0-33V33" stroke="#cbd2c7" strokeWidth={ROAD.width + 1.2} />
      <path d="M-33 0H33M0-33V33" stroke="#64716c" strokeWidth={ROAD.width} />
      {APPROACHES.map((approach, index) => (
        <g key={approach} transform={`rotate(${-index * 90})`}>
          <path d="M0 11V33" stroke="white" strokeWidth=".12" strokeDasharray="2 2" />
          {Array.from({ length: 9 }, (_, stripe) => (
            <rect
              key={stripe}
              x={(stripe - 4) * 1.04 - 0.275}
              y={ROAD.crossingCenter - ROAD.crossingDepth / 2}
              width=".55"
              height={ROAD.crossingDepth}
              fill="#fffdf2"
            />
          ))}
          <rect
            x=".15"
            y={ROAD.stopDistance - 0.11}
            width={ROAD.laneWidth - 0.3}
            height=".22"
            fill="white"
          />
          <g transform="translate(6.4 10)">
            <rect x="-1" y="-1.3" width="2" height="2.6" rx=".5" fill="#1c3028" />
            <circle data-signal={approach} r=".65" fill={COLORS[signalAt(scenario, approach, 0)]} />
          </g>
          {scenario.control === "priority-signs" && (
            <g transform="translate(7.2 14)">
              <title>
                {approach === "east" || approach === "west" ? "Головна дорога" : "Дати дорогу"}
              </title>
              {approach === "east" || approach === "west" ? (
                <path
                  d="M0-1.5L1.5 0L0 1.5L-1.5 0Z"
                  fill="#ffdb55"
                  stroke="white"
                  strokeWidth=".35"
                />
              ) : (
                <path
                  d="M-1.5 1.2L1.5 1.2L0-1.4Z"
                  fill="white"
                  stroke="#d53f36"
                  strokeWidth=".35"
                />
              )}
            </g>
          )}
        </g>
      ))}
      {scenario.cars.map((entry) => (
        <path
          key={entry.id}
          d={diagramPath(entry)}
          fill="none"
          stroke={entry.color}
          strokeWidth={selected === entry.id ? 0.45 : 0.25}
          strokeDasharray=".8 .6"
          markerEnd={`url(#${markerId})`}
        />
      ))}
      {scenario.cars.map((entry) => (
        <g
          key={entry.id}
          data-car={entry.id}
          transform={diagramTransform(sampleMotion(entry, 0))}
          role="button"
          tabIndex={0}
          aria-label={`Обрати ${entry.label}`}
          aria-pressed={selected === entry.id}
          onClick={() => onSelect(entry.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(entry.id);
            }
          }}
          className="trainer-diagram-car"
        >
          <circle
            r="3.2"
            fill="transparent"
            stroke={selected === entry.id ? entry.color : "none"}
            strokeWidth=".25"
          />
          <rect
            x="-1.05"
            y="-2.35"
            width="2.1"
            height="4.7"
            rx=".55"
            fill={entry.kind === "sedan" ? "#287bc1" : "#68866a"}
            stroke="#10231e"
            strokeWidth=".12"
          />
          <rect x="-.8" y=".6" width="1.6" height=".7" rx=".2" fill="#c9e9ef" />
          <path d="M-.8 2H-.4M.4 2H.8" stroke="#fffacb" strokeWidth=".28" />
          <g data-indicator={entry.id} visibility="hidden">
            <path
              d={`M${entry.maneuver === "left" ? 0.9 : -0.9} 1.8v.4`}
              stroke="#ffb000"
              strokeWidth=".4"
            />
          </g>
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="1.4"
            fontWeight="800"
            transform="rotate(180)"
          >
            {entry.id === "a" ? "А" : entry.id === "b" ? "Б" : "В"}
          </text>
        </g>
      ))}
      <text x="-31" y="-29" fontSize="1.6" fill="#52635a">
        Пн ↑
      </text>
      <text x="-31" y="31" fontSize="1.25" fill="#52635a">
        Знаки та сигнали — умови поточного прикладу
      </text>
    </svg>
  );
}

"use client";
import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { SceneEnvironment, SceneRenderer } from "@traffic-laws/scene-engine/react";
import { DEMO_SCENARIOS } from "@traffic-laws/scenarios/demo";
import { EDUCATIONAL_DEMO_SCENARIOS } from "@traffic-laws/scenarios/education-demo";
import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";
import { evaluateScenarioDecision } from "@traffic-laws/scenarios/scenario-decision";
import ScenarioDecisionOverlay from "./ScenarioDecisionOverlay";

const SCENARIOS = [...EDUCATIONAL_DEMO_SCENARIOS, ...DEMO_SCENARIOS];
const RULES = new Map(UA_PDR_REFERENCES.map((rule) => [rule.id, rule]));
const MANEUVER_LABEL = {
  straight: "прямо",
  left: "ліворуч",
  right: "праворуч",
  "u-turn": "розворот",
} as const;
const ADMISSION_LABEL = {
  allowed: "умовно допускається",
  prohibited: "умовно заборонено",
  unknown: "не визначено",
} as const;
const CERTAINTY_LABEL = {
  determinate: "визначено для моделі",
  ambiguous: "суперечливі умови",
  unsupported: "не підтверджено або не підтримується",
  insufficient_data: "бракує даних",
} as const;
const EVIDENCE_LABEL = {
  observed: "спостережено в сцені",
  authored: "задано автором",
  unresolved: "не встановлено",
} as const;
const ASSESSMENT_LABEL = {
  possible: "можливо лише в перевіреній моделі",
  blocked: "не підтверджено як одночасний рух",
  unknown: "невідомо",
} as const;
const TEMPORAL_LABEL = {
  "possible-overlap": "інтервали можуть перетинатися",
  separated: "інтервали не перетинаються",
  unknown: "невідомо",
} as const;
const CONTENT_STATUS_LABEL = {
  draft: "чернетка",
  in_review: "на перевірці",
  verified: "перевірено",
  published: "опубліковано",
} as const;

export default function ScenarioPreview() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const scenario = SCENARIOS[index];
  const scene = scenario.sceneReference?.scene;
  const trafficDecision = scenario.trafficDecision;
  const decision = useMemo(
    () =>
      scene && trafficDecision
        ? evaluateScenarioDecision(
            scene,
            trafficDecision.situation,
            trafficDecision.claim,
            UA_PDR_REFERENCES,
            trafficDecision.sceneBinding,
          )
        : null,
    [scene, trafficDecision],
  );
  const focusedVehicleId =
    selectedVehicleId ??
    (trafficDecision?.claim.kind === "yield"
      ? trafficDecision.claim.fromVehicleId
      : (trafficDecision?.claim.vehicleId ?? null));
  return (
    <section>
      <p>
        Демонстраційний чернетковий контент. Нормативна достовірність не підтверджена; це не
        офіційний білет ПДР.
      </p>
      <label>
        Варіант сцени:{" "}
        <select
          value={index}
          onChange={(event) => {
            setIndex(Number(event.target.value));
            setSelected(null);
            setSelectedVehicleId(null);
          }}
        >
          {SCENARIOS.map((item, position) => (
            <option value={position} key={item.id}>
              {item.id}
            </option>
          ))}
        </select>
      </label>
      {scene && (
        <div style={{ height: 480, marginTop: 16 }} aria-label="Демонстраційна 3D-сцена">
          <Canvas
            frameloop="demand"
            shadows="soft"
            camera={{ position: [32, 28, 38], fov: 43, near: 0.1, far: 240 }}
            onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
          >
            <SceneEnvironment />
            <SceneRenderer
              scene={scene}
              onSelect={(instanceId) => {
                const participant = decision?.participants.find(
                  (entry) => entry.sceneInstanceId === instanceId,
                );
                if (participant) setSelectedVehicleId(participant.vehicleId);
              }}
            />
            {decision && (
              <ScenarioDecisionOverlay
                scene={scene}
                decision={decision}
                selectedVehicleId={focusedVehicleId}
              />
            )}
          </Canvas>
        </div>
      )}
      {scenario.id.startsWith("demo-urban") && (
        <p>
          Південний світлофор:{" "}
          {scene?.objects.find((object) => object.instanceId === "light-s")?.properties.signal ===
          "green"
            ? "зелений"
            : "червоний"}
        </p>
      )}
      <h2>{scenario.question}</h2>
      <div role="group" aria-label="Варіанти відповіді">
        {scenario.answers.map((answer) => (
          <button
            key={answer.id}
            type="button"
            onClick={() => setSelected(answer.id)}
            style={{ padding: 12, marginRight: 8, border: "1px solid #334155", borderRadius: 8 }}
          >
            {answer.text}
          </button>
        ))}
      </div>
      {selected && (
        <p role="status">
          {selected === scenario.correctAnswerId && (!decision || decision.claimSupported)
            ? "Обрано відповідь, позначену в чернетці як правильну."
            : "Обрана відповідь не збігається з варіантом у чернетці."}{" "}
          {scenario.explanation}
        </p>
      )}
      <p>
        Статус змісту: {CONTENT_STATUS_LABEL[scenario.contentStatus.state]}. Нормативна перевірка не
        завершена.
      </p>
      {decision && (
        <section aria-label="Спільне рішення для відповіді та 3D">
          <h3>Рішення для відповіді та 3D</h3>
          <p>
            Технічний стан: {CERTAINTY_LABEL[decision.analysis.technicalCertainty]}; нормативний
            статус:{" "}
            {decision.analysis.normativeStatus === "unverified"
              ? "не перевірено незалежно"
              : decision.analysis.normativeStatus === "verified"
                ? "джерело має відмітку перевірки"
                : "не застосовується"}
            ; загальний стан: {CERTAINTY_LABEL[decision.analysis.certainty]}. Це умовна модель, не
            перевірений юридичний висновок.
          </p>
          <p>
            Кільця позначають учасників, лінії — авторські наміри руху. Жовтогарячий колір позначає
            вибір або потенційний конфлікт, а не дозвіл чи перевагу.
          </p>
          <p>
            Прив’язка смуг, активність інших учасників і часові умови заявлені автором та потребують
            незалежної перевірки.
          </p>
          <div role="group" aria-label="Учасники сцени">
            {decision.participants.map((participant) => (
              <button
                key={participant.vehicleId}
                type="button"
                aria-pressed={focusedVehicleId === participant.vehicleId}
                onClick={() => setSelectedVehicleId(participant.vehicleId)}
                style={{ marginRight: 8, padding: 8 }}
              >
                {participant.vehicleId}: {MANEUVER_LABEL[participant.maneuver]} —{" "}
                {ADMISSION_LABEL[participant.admission]} (лише за заданими умовами)
              </button>
            ))}
          </div>
          {decision.analysis.yieldObligations.map((edge) => (
            <p key={`${edge.fromVehicleId}-${edge.toVehicleId}`}>
              Умовний обов’язок уступити: {edge.fromVehicleId} → {edge.toVehicleId} (
              {edge.ruleReferences.join(", ")}).
            </p>
          ))}
          {decision.analysis.pathConflicts
            .filter((pair) => pair.sweptGeometry === "intersects")
            .map((pair) => (
              <p key={`${pair.firstVehicleId}-${pair.secondVehicleId}`}>
                Спільна зона траєкторій: {pair.firstVehicleId} / {pair.secondVehicleId}; час:{" "}
                {TEMPORAL_LABEL[pair.temporal]}. Це не прогноз зіткнення.
              </p>
            ))}
          {decision.analysis.simultaneousMovement.map((group) => (
            <p key={group.vehicleIds.join("-")}>
              Одночасний рух {group.vehicleIds.join(" / ")}: {ASSESSMENT_LABEL[group.status]}.{" "}
              {group.explanation}
            </p>
          ))}
          {decision.analysis.diagnostics.length > 0 && (
            <p role="alert">
              Невизначені або непідтверджені умови: {decision.analysis.diagnostics.join(" ")}
            </p>
          )}
          {decision.sceneFindings.some((finding) => finding.status !== "consistent") && (
            <p role="alert">
              Частина умов сцени не встановлена або суперечлива; дивіться походження умов нижче.
            </p>
          )}
          <details>
            <summary>Походження умов сцени: спостережені, задані автором, невирішені</summary>
            <ul>
              {decision.sceneFindings.map((finding) => (
                <li key={finding.subject}>
                  {finding.subject}: {EVIDENCE_LABEL[finding.evidence]} /{" "}
                  {finding.status === "consistent"
                    ? "узгоджено"
                    : finding.status === "conflict"
                      ? "суперечність"
                      : "бракує даних"}{" "}
                  — {finding.detail}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
      {scenario.ruleReferences.length > 0 && (
        <ul>
          {scenario.ruleReferences.map((ruleId) => {
            const rule = RULES.get(ruleId);
            return (
              <li key={ruleId}>
                {rule?.source ? (
                  <a href={rule.source.url} target="_blank" rel="noreferrer">
                    ПДР України, пункт {rule.source.section}
                  </a>
                ) : (
                  ruleId
                )}{" "}
                — {rule?.verification.status}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

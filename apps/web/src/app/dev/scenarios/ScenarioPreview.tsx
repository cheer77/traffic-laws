"use client";
import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { SceneEnvironment, SceneRenderer } from "@traffic-laws/scene-engine/react";
import { DEMO_SCENARIOS } from "@traffic-laws/scenarios/demo";
import { EDUCATIONAL_DEMO_SCENARIOS } from "@traffic-laws/scenarios/education-demo";
import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";
import { assessSceneConsistency } from "@traffic-laws/scenarios/scene-consistency";

const SCENARIOS = [...EDUCATIONAL_DEMO_SCENARIOS, ...DEMO_SCENARIOS];
const RULES = new Map(UA_PDR_REFERENCES.map((rule) => [rule.id, rule]));

export default function ScenarioPreview() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const scenario = SCENARIOS[index];
  const scene = scenario.sceneReference?.scene;
  const sceneFindings =
    scene && scenario.trafficDecision
      ? assessSceneConsistency(scene, scenario.trafficDecision.situation)
      : [];
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
            <SceneRenderer scene={scene} />
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
          {selected === scenario.correctAnswerId
            ? "Обрано відповідь, позначену в чернетці як правильну."
            : "Обрана відповідь не збігається з варіантом у чернетці."}{" "}
          {scenario.explanation}
        </p>
      )}
      <p>Статус змісту: {scenario.contentStatus.state}. Нормативна перевірка не завершена.</p>
      {sceneFindings.length > 0 && (
        <div>
          <p>
            3D: {sceneFindings.filter((item) => item.status === "confirmed").length} просторових
            зв’язків узгоджено; інші умови не підтверджені даними сцени.
          </p>
          <ul>
            {sceneFindings
              .filter((item) => item.status !== "confirmed")
              .map((item) => (
                <li key={item.subject}>
                  {item.status === "conflict" ? "Суперечність" : "Не підтверджено"}: {item.detail}
                </li>
              ))}
          </ul>
        </div>
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

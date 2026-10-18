"use client";
import { useActionState, useMemo, useState } from "react";
import type { CountryRule } from "@traffic-laws/country-rules";
import { saveScenarioAction, type FormState } from "@/app/actions";

interface DraftFields {
  id: string;
  category: string;
  question: string;
  answers: string[];
  correctIndex: number;
  explanation: string;
  ruleReferences: string[];
  sceneJson: string;
  state: "draft" | "in_review";
}

export function ScenarioEditor({ rules }: { rules: CountryRule[] }) {
  const [fields, setFields] = useState<DraftFields>({
    id: "",
    category: "Загальні правила",
    question: "",
    answers: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
    ruleReferences: [],
    sceneJson: "",
    state: "draft",
  });
  const [state, action, pending] = useActionState<FormState, FormData>(saveScenarioAction, {
    error: null,
  });
  const payload = useMemo(() => {
    const answers = fields.answers
      .map((text, index) => ({ id: `answer-${index + 1}`, text: text.trim() }))
      .filter((answer) => answer.text);
    let sceneReference: null | { kind: "snapshot"; scene: unknown } = null;
    try {
      if (fields.sceneJson.trim())
        sceneReference = { kind: "snapshot", scene: JSON.parse(fields.sceneJson) as unknown };
    } catch {
      sceneReference = { kind: "snapshot", scene: { invalidJson: true } };
    }
    return JSON.stringify({
      schemaVersion: 1,
      revision: 1,
      id: fields.id.trim(),
      country: "UA",
      language: "uk",
      category: fields.category.trim(),
      question: fields.question.trim(),
      answers,
      correctAnswerId: `answer-${fields.correctIndex + 1}`,
      explanation: fields.explanation.trim(),
      ruleReferences: fields.ruleReferences,
      sceneReference,
      contentStatus: { state: fields.state },
    });
  }, [fields]);
  const answerCount = fields.answers.filter((answer) => answer.trim()).length;
  const canSubmit = Boolean(
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(fields.id) &&
    fields.question.trim().length > 0 &&
    fields.explanation.trim().length > 0 &&
    answerCount >= 2 &&
    fields.answers[fields.correctIndex]?.trim(),
  );
  return (
    <form action={action} className="scenario-editor">
      <input type="hidden" name="expectedRevision" value="0" />
      <input type="hidden" name="payload" value={payload} />
      <div className="grid">
        <div>
          <label htmlFor="scenario-id">Технічний ID</label>
          <input
            id="scenario-id"
            value={fields.id}
            onChange={(event) => setFields({ ...fields, id: event.target.value })}
            pattern="[a-zA-Z0-9][a-zA-Z0-9._-]*"
            maxLength={80}
            placeholder="ua-crossroad-001"
            required
          />
          <small className="muted">Латинські літери, цифри, крапка, дефіс або підкреслення.</small>
        </div>
        <div>
          <label htmlFor="category">Категорія</label>
          <input
            id="category"
            value={fields.category}
            onChange={(event) => setFields({ ...fields, category: event.target.value })}
            maxLength={120}
            required
          />
        </div>
      </div>
      <label htmlFor="question">Запитання</label>
      <textarea
        id="question"
        className="short-textarea"
        value={fields.question}
        onChange={(event) => setFields({ ...fields, question: event.target.value })}
        maxLength={1000}
        required
      />
      <fieldset className="answers-editor">
        <legend>Варіанти відповіді та правильний варіант</legend>
        {fields.answers.map((answer, index) => (
          <div key={index}>
            <input
              type="radio"
              name="correct"
              checked={fields.correctIndex === index}
              onChange={() => setFields({ ...fields, correctIndex: index })}
              aria-label={`Правильний варіант ${index + 1}`}
            />
            <input
              value={answer}
              onChange={(event) => {
                const answers = [...fields.answers];
                answers[index] = event.target.value;
                setFields({ ...fields, answers });
              }}
              placeholder={`Варіант ${index + 1}${index < 2 ? " (обов’язково)" : ""}`}
              required={index < 2}
              maxLength={1000}
            />
          </div>
        ))}
      </fieldset>
      <label htmlFor="explanation">Пояснення після відповіді</label>
      <textarea
        id="explanation"
        className="short-textarea"
        value={fields.explanation}
        onChange={(event) => setFields({ ...fields, explanation: event.target.value })}
        maxLength={3000}
        required
      />
      <label htmlFor="rules">Нормативні посилання</label>
      <select
        id="rules"
        multiple
        size={6}
        value={fields.ruleReferences}
        onChange={(event) =>
          setFields({
            ...fields,
            ruleReferences: Array.from(event.target.selectedOptions, (option) => option.value),
          })
        }
      >
        {rules.map((rule) => (
          <option key={rule.id} value={rule.id}>
            {rule.source?.section ?? rule.id} — {rule.summary}
          </option>
        ))}
      </select>
      <p className="muted">
        Для публікації потрібне щонайменше одне джерело. Утримуйте Ctrl/Cmd, щоб вибрати кілька.
      </p>
      <details className="advanced-editor">
        <summary>Додати 3D-сцену зі Studio</summary>
        <label htmlFor="scene-json">Scene Definition JSON</label>
        <textarea
          id="scene-json"
          value={fields.sceneJson}
          onChange={(event) => setFields({ ...fields, sceneJson: event.target.value })}
          spellCheck={false}
          placeholder="Вставте експортовану зі Studio Scene Definition v1"
        />
        <p className="muted">
          Сцена повторно перевіряється спільним Scene Engine. Без цього поля буде створено текстовий
          білет.
        </p>
      </details>
      <label htmlFor="content-state">Редакційний стан</label>
      <select
        id="content-state"
        value={fields.state}
        onChange={(event) =>
          setFields({ ...fields, state: event.target.value as DraftFields["state"] })
        }
      >
        <option value="draft">Чернетка</option>
        <option value="in_review">Готово до перевірки власником</option>
      </select>
      {state.error && (
        <p className="alert" role="alert">
          {state.error}
        </p>
      )}
      <button className="button" disabled={pending || !canSubmit}>
        {pending ? "Створюємо…" : "Створити незмінну ревізію"}
      </button>
    </form>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";
import { evaluateScenarioDecision } from "@traffic-laws/scenarios/scenario-decision";
import { apiFetch, ApiError, requireStaff } from "@/lib/api";
import type { Page, RevisionDetail, RevisionMetadata } from "@/lib/contracts";
import { ScenarioForm } from "@/components/ActionForm";
import { ReviewForm } from "@/components/ReviewForm";
import { ScenePreview } from "@/components/ScenePreview";
import { previewScene } from "@/lib/preview-scene";
const rules = new Map(UA_PDR_REFERENCES.map((rule) => [rule.id, rule]));
const certaintyLabels: Record<string, string> = {
  determinate: "визначено для моделі",
  ambiguous: "суперечливі умови",
  unsupported: "не підтверджено або не підтримується",
  insufficient_data: "бракує даних",
};
const normativeLabels: Record<string, string> = {
  verified: "джерело має відмітку перевірки",
  unverified: "не перевірено незалежно",
  not_applicable: "не застосовується",
};
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string; revision: string }>;
}) {
  const { id, revision: raw } = await params;
  if (!/^\d+$/.test(raw) || Number(raw) < 1) notFound();
  const revision = Number(raw),
    safeId = encodeURIComponent(id);
  const profile = await requireStaff();
  let detail: RevisionDetail;
  try {
    detail = await apiFetch<RevisionDetail>(`/internal/scenarios/${safeId}/revisions/${revision}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const scenario = detail.payload;
  const preview = previewScene(scenario.sceneReference?.scene);
  const history = await apiFetch<Page<RevisionMetadata>>(
    `/internal/scenarios/${safeId}/revisions?limit=50`,
  );
  const decision =
    preview.scene && scenario.trafficDecision
      ? evaluateScenarioDecision(
          preview.scene,
          scenario.trafficDecision.situation,
          scenario.trafficDecision.claim,
          UA_PDR_REFERENCES,
          scenario.trafficDecision.sceneBinding,
        )
      : null;
  const latest = history.items[0]?.revision === revision;
  const editable =
    latest &&
    (scenario.contentStatus.state === "draft" || scenario.contentStatus.state === "in_review");
  const nextPayload = { ...scenario, revision: revision + 1 };
  return (
    <>
      <p>
        <Link href="/scenarios">← Сценарії</Link>
      </p>
      <h1>{scenario.question}</h1>
      <p className="muted">
        {scenario.id} · ревізія {revision} · {new Date(detail.createdAt).toLocaleString("uk-UA")}
      </p>
      <p className="notice">
        Статус:{" "}
        {
          {
            draft: "Чернетка",
            in_review: "На перевірці",
            verified: "Перевірено",
            published: "Опубліковано",
          }[scenario.contentStatus.state]
        }
        . Рекомендація рецензента не підтверджує юридичну правильність. Публікація недоступна.
      </p>
      <div className="grid">
        <section className="card">
          <h2>Запитання та відповіді</h2>
          <p>{scenario.question}</p>
          <ul>
            {scenario.answers.map((answer) => (
              <li key={answer.id}>
                {answer.text}{" "}
                {answer.id === scenario.correctAnswerId && <strong>· позначено автором</strong>}
              </li>
            ))}
          </ul>
          <h2>Пояснення</h2>
          <p>{scenario.explanation}</p>
        </section>
        <section className="card">
          <h2>Нормативні джерела</h2>
          {scenario.ruleReferences.length ? (
            <ul>
              {scenario.ruleReferences.map((id) => {
                const rule = rules.get(id);
                return (
                  <li key={id}>
                    {rule?.source ? (
                      <a href={rule.source.url} target="_blank" rel="noreferrer">
                        ПДР України, пункт {rule.source.section}
                      </a>
                    ) : (
                      id
                    )}{" "}
                    ·{" "}
                    {rule?.verification.status === "unverified"
                      ? "не перевірено незалежно"
                      : (rule?.verification.status ?? "невідомо")}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>Нормативних посилань немає.</p>
          )}
        </section>
      </div>
      {decision && (
        <section className="card">
          <h2>Технічний висновок</h2>
          <p>
            Певність моделі: {certaintyLabels[decision.analysis.technicalCertainty]}; нормативний
            стан: {normativeLabels[decision.analysis.normativeStatus] ?? "не встановлено"}; загальна
            певність: {certaintyLabels[decision.analysis.certainty]}.
          </p>
          {decision.analysis.diagnostics.length > 0 && (
            <p role="alert" className="alert">
              {decision.analysis.diagnostics.join(" ")}
            </p>
          )}
          <p>Висновок описує лише підтримувані умови моделі та не є юридичним схваленням.</p>
        </section>
      )}
      {(preview.scene || preview.invalid) && (
        <section className="card">
          <h2>Перегляд сцени</h2>
          {preview.scene ? (
            <ScenePreview scene={preview.scene} />
          ) : (
            <p role="alert">Неможливо показати 3D-сцену: некоректні дані.</p>
          )}
          <p className="muted">
            Сцена відтворює збережений знімок. Статичне зображення не доводить умови руху.
          </p>
        </section>
      )}
      <section className="card">
        <h2>Історія ревізій</h2>
        <ul>
          {history.items.map((item) => (
            <li key={item.revision}>
              <Link href={`/scenarios/${safeId}/${item.revision}`}>Ревізія {item.revision}</Link> ·{" "}
              {new Date(item.createdAt).toLocaleString("uk-UA")}
            </li>
          ))}
        </ul>
        {history.nextPage && <p>Показано перші 50 ревізій.</p>}
      </section>
      <section className="card">
        <h2>Рецензії цієї ревізії</h2>
        {detail.reviews.length ? (
          <ul>
            {detail.reviews.map((review) => (
              <li key={review.id}>
                <strong>
                  {review.decision === "recommend_approval"
                    ? "Рекомендовано схвалення"
                    : review.decision === "changes_requested"
                      ? "Потрібні зміни"
                      : "Відхилено"}
                </strong>{" "}
                · {new Date(review.createdAt).toLocaleString("uk-UA")}
                <p>{review.evidence}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>Рецензій ще немає.</p>
        )}
        {profile.id !== detail.authorId ? (
          <ReviewForm id={id} revision={revision} />
        ) : (
          <p className="muted">Автор не може рецензувати власну ревізію.</p>
        )}
      </section>
      {editable && (
        <section className="card">
          <h2>Створити наступну ревізію</h2>
          <ScenarioForm
            payload={JSON.stringify(nextPayload, null, 2)}
            expectedRevision={revision}
          />
        </section>
      )}
      <section className="card">
        <h2>Публікація</h2>
        <p>Немає дозволеного процесу публікації. API завжди повертає HTTP 403.</p>
      </section>
    </>
  );
}

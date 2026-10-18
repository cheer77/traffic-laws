import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import type { Question } from "@/lib/contracts";
import { AttemptForm } from "@/components/AttemptForm";
import { ScenePreview } from "@/components/ScenePreview";
export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string; revision: string }>;
}) {
  const { id, revision: raw } = await params;
  if (!/^\d+$/.test(raw)) notFound();
  let question: Question;
  try {
    question = await apiFetch<Question>(`/scenarios/${encodeURIComponent(id)}/revisions/${raw}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <>
      <Link className="back-link" href="/school/tickets">
        ← До каталогу
      </Link>
      <div className="ticket-heading">
        <div>
          <span className={`ticket-type ticket-${question.sceneReference ? "3d" : "text"}`}>
            {question.sceneReference ? "3D-ситуація" : "Текстове завдання"}
          </span>
          <small>
            {question.category} · ревізія {question.revision}
          </small>
        </div>
      </div>
      {question.sceneReference && <ScenePreview scene={question.sceneReference.scene} />}
      <AttemptForm question={question} />
      <p className="learning-note">
        Матеріал має навчальний характер. Для рішень на дорозі звіряйтеся з чинною офіційною
        редакцією ПДР України.
      </p>
    </>
  );
}

"use client";
import { useActionState } from "react";
import { submitAttemptAction, type FormState } from "@/app/actions";
import type { Question } from "@/lib/contracts";
export function AttemptForm({ question }: { question: Question }) {
  const action = submitAttemptAction.bind(null, question.id, question.revision);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });
  return (
    <div className="question-panel">
      <form action={formAction}>
        <fieldset disabled={pending || Boolean(state.feedback)}>
          <legend>{question.question}</legend>
          <div className="answer-list">
            {question.answers.map((answer, index) => (
              <label
                className={`answer ${state.feedback?.correctAnswerId === answer.id ? "answer-correct" : ""}`}
                key={answer.id}
              >
                <input type="radio" name="answerId" value={answer.id} required />
                <span className="answer-letter">{String.fromCharCode(65 + index)}</span>
                <span>{answer.text}</span>
              </label>
            ))}
          </div>
          <button className="button button-wide">
            {pending ? "Перевіряємо…" : "Перевірити відповідь"}
          </button>
        </fieldset>
      </form>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.feedback && (
        <section
          className={`feedback ${state.feedback.correct ? "feedback-correct" : "feedback-wrong"}`}
          role="status"
        >
          <strong>{state.feedback.correct ? "Правильно" : "Варто повторити"}</strong>
          <p>{state.feedback.explanation}</p>
          <span>Джерела: {state.feedback.ruleReferences.join(", ") || "не вказані"}</span>
        </section>
      )}
    </div>
  );
}

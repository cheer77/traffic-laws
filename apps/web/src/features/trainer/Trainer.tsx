"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  CheckCircle2,
  CircleHelp,
  GraduationCap,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TrainerDiagram from "./TrainerDiagram";
import type { CameraCommand, CameraMode } from "./TrainerScene";
import type { Playback } from "./motion";
import { TRAINING_SCENARIOS, checkAnswer, type TrainingScenario } from "./scenarios";
import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";

const Scene = dynamic(() => import("./TrainerScene"), {
  ssr: false,
  loading: () => <div className="trainer-loading">Готуємо перехрестя…</div>,
});
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="trainer-loading">
        Не вдалося запустити 3D. Перевірте підтримку WebGL та перезавантажте сторінку.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Trainer() {
  const [index, setIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const scenario = TRAINING_SCENARIOS[index];
  return (
    <main className="trainer">
      <header className="trainer-header">
        <Link className="trainer-brand" href="/school">
          <span>
            <GraduationCap size={25} />
          </span>
          Traffic<span className="trainer-brand-light">Laws</span>
        </Link>
        <span className="trainer-header-title">Інтерактивна автошкола</span>
        <span className="trainer-local">Локальний тренажер · UA</span>
      </header>
      <div className="trainer-heading">
        <div>
          <span className="trainer-eyebrow">НАВЧАЙСЯ · РОЗУМІЙ · КЕРУЙ</span>
          <h1>Перехрестя без сумнівів</h1>
          <p>Розбери ситуацію. Обери відповідь. Побач правильний рух.</p>
        </div>
        <div className="trainer-progress">
          <CheckCircle2 size={20} />
          <span>
            <strong>{completed.length} / 5</strong> опрацьовано
          </span>
        </div>
      </div>
      <div className="trainer-workspace">
        <aside className="trainer-sidebar" aria-label="Навчальні сценарії">
          <div className="trainer-panel-heading">
            <h2>Дорожні ситуації</h2>
            <span>05</span>
          </div>
          <label className="trainer-search">
            <Search size={17} />
            <input
              placeholder="Знайти ситуацію"
              aria-label="Пошук сценаріїв"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <nav>
            {TRAINING_SCENARIOS.map(
              (entry, position) =>
                entry.title.toLocaleLowerCase("uk").includes(search.toLocaleLowerCase("uk")) && (
                  <button
                    key={entry.id}
                    className={`trainer-ticket ${index === position ? "is-active" : ""}`}
                    aria-current={index === position ? "step" : undefined}
                    onClick={() => setIndex(position)}
                  >
                    <span className="trainer-ticket-number">
                      {completed.includes(entry.id) ? <Check size={18} /> : `0${position + 1}`}
                    </span>
                    <span>
                      <strong>{entry.title}</strong>
                      <small>{entry.summary}</small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                ),
            )}
            {!TRAINING_SCENARIOS.some((entry) =>
              entry.title.toLocaleLowerCase("uk").includes(search.toLocaleLowerCase("uk")),
            ) && <p className="trainer-empty">Ситуацій не знайдено.</p>}
          </nav>
          <div className="trainer-tip">
            <CircleHelp size={21} />
            <strong>Спочатку — спостерігай</strong>
            <p>Обери авто на сцені, роздивись його напрямок та дорожні сигнали.</p>
          </div>
          <div className="trainer-draft">
            Навчальні приклади, не офіційні білети. Зміст потребує незалежної перевірки.
          </div>
        </aside>
        <Exercise
          key={scenario.id}
          scenario={scenario}
          index={index}
          onComplete={() =>
            setCompleted((ids) => (ids.includes(scenario.id) ? ids : [...ids, scenario.id]))
          }
          onNext={() => setIndex((index + 1) % TRAINING_SCENARIOS.length)}
        />
      </div>
      <footer className="trainer-footer">
        ПДР України · Умови моделей: без пішоходів, трамваїв і спецтранспорту; виїзд вільний.
        Прогрес зберігається лише до оновлення сторінки.
      </footer>
    </main>
  );
}
function Exercise({
  scenario,
  index,
  onComplete,
  onNext,
}: {
  scenario: TrainingScenario;
  index: number;
  onComplete: () => void;
  onNext: () => void;
}) {
  const [view, setView] = useState<"2d" | "3d">("3d");
  const [selected, setSelected] = useState(scenario.cars[0].id);
  const [order, setOrder] = useState<string[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [epoch, setEpoch] = useState(0);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand>({
    mode: "iso",
    revision: 0,
    zoom: 1,
  });
  const playback = useRef<Playback>({ time: 0, running: false, speed: 1 });
  const setCamera = (mode: CameraMode) =>
    setCameraCommand((command) => ({ ...command, mode, revision: command.revision + 1 }));
  const reset = (run = false) => {
    playback.current.time = 0;
    playback.current.running = run;
    setPlaying(run);
    setEnded(false);
    setEpoch((value) => value + 1);
  };
  const selectCar = (id: string) => {
    setSelected(id);
  };
  const addToOrder = (id: string) => {
    setSelected(id);
    setOrder((ids) => (ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]));
  };
  const ready =
    scenario.answer.kind === "order" ? order.length === scenario.cars.length : choice !== null;
  return (
    <>
      <section className="trainer-stage">
        <div className="trainer-panel-heading">
          <div>
            <span className="trainer-eyebrow">СИТУАЦІЯ {String(index + 1).padStart(2, "0")}</span>
            <h2>{scenario.title}</h2>
          </div>
          <div className="trainer-view-toggle" role="group" aria-label="Вигляд дорожньої ситуації">
            <button aria-pressed={view === "2d"} onClick={() => setView("2d")}>
              2D
            </button>
            <button aria-pressed={view === "3d"} onClick={() => setView("3d")}>
              3D
            </button>
          </div>
        </div>
        <div className="trainer-viewport">
          <SceneBoundary>
            {view === "3d" ? (
              <Scene
                key={epoch}
                scenario={scenario}
                playback={playback}
                selected={selected}
                cameraCommand={cameraCommand}
                onSelect={selectCar}
                playing={playing}
                onFinished={() => {
                  setPlaying(false);
                  setEnded(true);
                }}
              />
            ) : (
              <TrainerDiagram
                key={epoch}
                scenario={scenario}
                playback={playback}
                selected={selected}
                onSelect={selectCar}
                playing={playing}
                onFinished={() => {
                  setPlaying(false);
                  setEnded(true);
                }}
              />
            )}
          </SceneBoundary>
          <div className="trainer-scene-hint">
            {view === "2d"
              ? "Навчальна схема · не офіційне екзаменаційне зображення"
              : cameraCommand.mode === "driver"
                ? "Камера слідує за обраним авто"
                : "Обертай сцену · наближай · обирай авто"}
          </div>
          {view === "3d" && (
            <div className="trainer-zoom">
              <Button
                size="icon"
                variant="outline"
                aria-label="Наблизити"
                onClick={() =>
                  setCameraCommand((command) => ({
                    ...command,
                    zoom: Math.max(0.6, command.zoom - 0.15),
                    revision: command.revision + 1,
                  }))
                }
              >
                <ZoomIn size={18} />
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Віддалити"
                onClick={() =>
                  setCameraCommand((command) => ({
                    ...command,
                    zoom: Math.min(1.4, command.zoom + 0.15),
                    revision: command.revision + 1,
                  }))
                }
              >
                <ZoomOut size={18} />
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Скинути камеру"
                onClick={() =>
                  setCameraCommand((command) => ({
                    mode: "iso",
                    zoom: 1,
                    revision: command.revision + 1,
                  }))
                }
              >
                <Maximize2 size={18} />
              </Button>
            </div>
          )}
        </div>
        {view === "3d" && (
          <div className="trainer-camera" role="group" aria-label="Режим камери">
            {(
              [
                ["iso", "Ізометрія"],
                ["top", "Зверху"],
                ["driver", "За авто"],
                ["free", "Вільна"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                aria-pressed={cameraCommand.mode === mode}
                onClick={() => setCamera(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="trainer-cars" aria-label="Автомобілі">
          {scenario.cars.map((entry) => (
            <button
              key={entry.id}
              aria-pressed={selected === entry.id}
              onClick={() => selectCar(entry.id)}
            >
              <span style={{ background: entry.color }} />
              <CarFront size={18} />
              {entry.label}
              <small>
                {entry.maneuver === "left"
                  ? "↰ ліворуч"
                  : entry.maneuver === "right"
                    ? "↱ праворуч"
                    : "↑ прямо"}
              </small>
            </button>
          ))}
        </div>
        <div className="trainer-playback">
          <Button
            disabled={result === null}
            onClick={() => {
              if (ended) reset(true);
              else {
                playback.current.running = !playing;
                setPlaying(!playing);
              }
            }}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
            {playing ? "Пауза" : ended ? "Повторити" : "Запустити"}
          </Button>
          <Button
            variant="ghost"
            disabled={result === null}
            onClick={() => reset(true)}
            aria-label="Повторити від початку"
          >
            <RotateCcw size={18} />
          </Button>
          <Button variant="ghost" onClick={() => reset()}>
            Скинути
          </Button>
          <div className="trainer-speed" role="group" aria-label="Швидкість">
            {[0.5, 1, 2].map((value) => (
              <button
                key={value}
                aria-pressed={speed === value}
                onClick={() => {
                  playback.current.speed = value;
                  setSpeed(value);
                }}
              >
                {value}×
              </button>
            ))}
          </div>
        </div>
        <p className="trainer-playback-note" role="status">
          {result === null
            ? "Перевір відповідь, щоб відкрити анімований розбір."
            : ended
              ? "Проїзд завершено. Можна повторити або перейти далі."
              : "Авторський план руху · відтворення правильного розв’язання"}
        </p>
      </section>
      <aside className="trainer-question">
        <div className="trainer-panel-heading">
          <span className="trainer-eyebrow">ТВОЄ РІШЕННЯ</span>
          <span>{index + 1} / 5</span>
        </div>
        <h2>{scenario.question}</h2>
        <p className="trainer-question-hint">
          {scenario.answer.kind === "order"
            ? "Обирай автомобілі нижче в порядку проїзду. Повторне натискання прибирає авто з черги."
            : "Обери одну відповідь."}
        </p>
        <fieldset disabled={result !== null}>
          <legend className="sr-only">Відповідь</legend>
          <div className="trainer-answers">
            {scenario.answer.kind === "order"
              ? scenario.cars.map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    className={order.includes(entry.id) ? "is-selected" : ""}
                    aria-pressed={order.includes(entry.id)}
                    onClick={() => addToOrder(entry.id)}
                  >
                    <span>{order.includes(entry.id) ? order.indexOf(entry.id) + 1 : "—"}</span>
                    {entry.label}
                  </button>
                ))
              : scenario.answer.options.map((option, position) => (
                  <label key={option} className={choice === position ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="answer"
                      checked={choice === position}
                      onChange={() => setChoice(position)}
                    />
                    <span>{String.fromCharCode(1040 + position)}</span>
                    {option}
                  </label>
                ))}
          </div>
        </fieldset>
        {result === null ? (
          <Button
            className="trainer-check"
            disabled={!ready}
            onClick={() => {
              const correct = checkAnswer(scenario, order, choice);
              setResult(correct);
              if (correct) onComplete();
            }}
          >
            Перевірити <ArrowRight size={18} />
          </Button>
        ) : (
          <div className={`trainer-result ${result ? "is-correct" : "is-incorrect"}`} role="status">
            <strong>{result ? "Так, правильно!" : "Спробуй розібратися ще раз"}</strong>
            <p>{scenario.explanation}</p>
            <div className="trainer-references">
              {scenario.references.map((id) => {
                const rule = UA_PDR_REFERENCES.find((entry) => entry.id === id);
                return rule?.source ? (
                  <a key={id} href={rule.source.url} target="_blank" rel="noreferrer">
                    ПДР {rule.source.section} ↗
                  </a>
                ) : null;
              })}
            </div>
            <Button className="trainer-check" onClick={() => reset(true)}>
              <Play size={16} />
              Показати рух
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                reset();
                setOrder([]);
                setChoice(null);
                setResult(null);
              }}
            >
              <ArrowLeft size={16} />
              Спробувати ще
            </Button>
          </div>
        )}
        <div className="trainer-question-bottom">
          <p>
            <CircleHelp size={16} />
            Оцінюється відповідь для цього навчального прикладу.
          </p>
          <Button variant="outline" className="trainer-check" onClick={onNext}>
            Наступна ситуація <ArrowRight size={17} />
          </Button>
        </div>
      </aside>
    </>
  );
}

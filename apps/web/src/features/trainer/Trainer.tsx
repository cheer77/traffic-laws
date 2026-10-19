"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
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
import type { CameraCommand, CameraMode } from "./TrainerScene";
import type { Playback } from "./motion";
import { TRAINING_SCENARIOS, checkAnswer, type TrainingScenario } from "./scenarios";

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
          <h1>Офіційні питання ПДР</h1>
          <p>Розглянь оригінал. Обери відповідь. Перевір себе.</p>
        </div>
        <div className="trainer-progress">
          <CheckCircle2 size={20} />
          <span>
            <strong>
              {completed.length} / {TRAINING_SCENARIOS.length}
            </strong>{" "}
            опрацьовано
          </span>
        </div>
      </div>
      <div className="trainer-workspace">
        <aside className="trainer-sidebar" aria-label="Навчальні сценарії">
          <div className="trainer-panel-heading">
            <h2>Дорожні ситуації</h2>
            <span>{String(TRAINING_SCENARIOS.length).padStart(2, "0")}</span>
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
                      {completed.includes(entry.id) ? (
                        <Check size={18} />
                      ) : (
                        String(position + 1).padStart(2, "0")
                      )}
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
            <strong>Оригінал і реконструкція</strong>
            <p>
              3D стане доступним після перевірки реконструкції. Зараз досліджуй оригінал із PDF.
            </p>
          </div>
          <div className="trainer-draft">
            Оригінальні 2D-матеріали з наданого офіційного PDF. Лише локальний прототип.
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
        Розділ 16.1 · Офіційні 2D-зображення. 3D-реконструкції очікують перевірки. Права на публічне
        використання ілюстрацій окремо не підтверджені. Прогрес зберігається лише до оновлення
        сторінки.
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
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [selected, setSelected] = useState(scenario.cars[0]?.id ?? "");
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
  const ready = choice !== null && scenario.answer.correct !== null;
  return (
    <>
      <section className="trainer-stage">
        <div className="trainer-panel-heading">
          <div>
            <span className="trainer-eyebrow">СИТУАЦІЯ {String(index + 1).padStart(2, "0")}</span>
            <h2>{scenario.title}</h2>
          </div>
          {scenario.scene && (
            <div
              className="trainer-view-toggle"
              role="group"
              aria-label="Вигляд дорожньої ситуації"
            >
              <button aria-pressed={view === "2d"} onClick={() => setView("2d")}>
                2D
              </button>
              <button aria-pressed={view === "3d"} onClick={() => setView("3d")}>
                3D
              </button>
            </div>
          )}
        </div>
        <div className="trainer-viewport">
          <SceneBoundary>
            {view === "3d" && scenario.scene ? (
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
            ) : null}
          </SceneBoundary>
          {view === "2d" && scenario.image && (
            <div className="trainer-official-image">
              <Image
                src={scenario.image.src}
                width={scenario.image.width}
                height={scenario.image.height}
                sizes="(max-width: 720px) 100vw, 60vw"
                alt={`Офіційна ілюстрація до питання ${scenario.section ?? "16.1"} №${scenario.number}`}
                priority={index === 0}
              />
            </div>
          )}
          <div className="trainer-scene-hint">
            {view === "2d"
              ? scenario.image
                ? `Оригінальна ілюстрація · сторінка ${scenario.image.sourcePage} PDF`
                : "Питання без ілюстрації"
              : cameraCommand.mode === "driver"
                ? "Камера слідує за обраним авто"
                : "Навчальна 3D-реконструкція за офіційним 2D-референсом"}
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
        {view === "3d" && scenario.scene && (
          <div className="trainer-camera" role="group" aria-label="Режим камери">
            {(
              [
                ["iso", "Ракурс референсу"],
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
        {view === "3d" && scenario.scene && (
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
        )}
        {view === "3d" && scenario.scene && (
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
        )}
        {view === "3d" && scenario.scene && (
          <p className="trainer-playback-note" role="status">
            {result === null
              ? "Перевір відповідь, щоб відкрити анімований розбір."
              : ended
                ? "Проїзд завершено. Можна повторити або перейти далі."
                : "Навчальна 3D-реконструкція офіційної ситуації · не є офіційною ілюстрацією"}
          </p>
        )}
      </section>
      <aside className="trainer-question">
        <div className="trainer-panel-heading">
          <span className="trainer-eyebrow">ТВОЄ РІШЕННЯ</span>
          <span>
            {index + 1} / {TRAINING_SCENARIOS.length}
          </span>
        </div>
        <h2>{scenario.question}</h2>
        {scenario.importReason && (
          <div className="trainer-draft">
            <p>{scenario.importReason}</p>
            <p>
              3D потребує перевірки. Пояснення за перевіреними положеннями ПДР ще не підготовлено.
            </p>
            {scenario.answerMethod === "assistant_visual_transcription" && (
              <p>
                Ключ відповіді зчитано асистентом зі скану таблиці; це не автоматичне OCR чи
                юридична перевірка.
              </p>
            )}
            {scenario.answer.correct === null && (
              <p role="status">Відповідь не підтверджена: перевірку результату вимкнено.</p>
            )}
          </div>
        )}
        <p className="trainer-question-hint">Обери одну відповідь.</p>
        <fieldset disabled={result !== null}>
          <legend className="sr-only">Відповідь</legend>
          <div className="trainer-answers">
            {scenario.answer.options.map((option, position) => (
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
              const correct = checkAnswer(scenario, choice);
              setResult(correct);
              if (correct) onComplete();
            }}
          >
            Перевірити <ArrowRight size={18} />
          </Button>
        ) : (
          <div className={`trainer-result ${result ? "is-correct" : "is-incorrect"}`} role="status">
            <strong>{result ? "Так, правильно!" : "Спробуй розібратися ще раз"}</strong>
            <p>
              Правильна відповідь за таблицею: варіант{" "}
              {scenario.answer.correct === null ? "не визначено" : scenario.answer.correct + 1}.
              Сторінка {scenario.answerSourcePage} PDF відповідей.
            </p>
            {scenario.scene && (
              <Button
                className="trainer-check"
                onClick={() => {
                  setView("3d");
                  reset(true);
                }}
              >
                <Play size={16} />
                Показати 3D-рух
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                reset();
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

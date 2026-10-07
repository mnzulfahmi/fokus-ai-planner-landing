"use client";

import { useLanguage } from "@/components/language-provider";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUp, Bell, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TaskId = "proposal" | "research" | "dentist";

const taskScores: Record<TaskId, number> = {
  proposal: 92,
  research: 78,
  dentist: 54,
};

const scenarios: Array<{
  order: readonly TaskId[];
  active: TaskId;
  score: number;
}> = [
  {
    order: ["proposal", "research", "dentist"] as const,
    active: "proposal",
    score: 92,
  },
  {
    order: ["research", "proposal", "dentist"] as const,
    active: "research",
    score: 86,
  },
  {
    order: ["proposal", "dentist", "research"] as const,
    active: "dentist",
    score: 81,
  },
];

const scenarioByTask: Record<TaskId, number> = {
  proposal: 0,
  research: 1,
  dentist: 2,
};

export function HeroSection() {
  const { locale, text } = useLanguage();
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);
  const updateTimer = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const scenarioState = scenarios[scenarioIndex];
  const scenario = {
    ...scenarioState,
    ...text.hero.scenarios[scenarioState.active],
  };
  const orderedTasks = useMemo(
    () => scenario.order.map((id) => ({ id, ...text.hero.tasks[id], score: taskScores[id] })),
    [scenario.order, text.hero.tasks],
  );

  const markUpdating = useCallback(() => {
    setIsUpdating(true);

    if (updateTimer.current !== null) {
      window.clearTimeout(updateTimer.current);
    }
    updateTimer.current = window.setTimeout(() => setIsUpdating(false), 620);
  }, []);

  const showScenario = useCallback((nextIndex: number) => {
    markUpdating();
    setScenarioIndex(nextIndex);
  }, [markUpdating]);

  const advance = useCallback(() => {
    markUpdating();
    setScenarioIndex((current) => (current + 1) % scenarios.length);
  }, [markUpdating]);

  const selectTask = (taskId: TaskId) => {
    const nextIndex = scenarioByTask[taskId];
    if (nextIndex === scenarioIndex) return;
    showScenario(nextIndex);
    setCycleKey((current) => current + 1);
  };

  useEffect(() => {
    if (reducedMotion) return;

    const interval = window.setInterval(() => {
      advance();
    }, 5600);

    return () => {
      window.clearInterval(interval);
    };
  }, [advance, cycleKey, reducedMotion]);

  useEffect(() => {
    return () => {
      if (updateTimer.current !== null) window.clearTimeout(updateTimer.current);
    };
  }, []);

  const replay = () => {
    if (reducedMotion) {
      setScenarioIndex((current) => (current + 1) % scenarios.length);
      return;
    }
    advance();
    setCycleKey((current) => current + 1);
  };

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="grid min-h-[calc(100dvh-5rem)] items-center gap-12 py-14 lg:grid-cols-[0.93fr_1.07fr] lg:gap-20 lg:py-16"
    >
      <div className="relative z-10">
        <p className="mb-6 flex items-center gap-3 text-xs font-black uppercase tracking-[0.14em]">
          <span className="h-0.5 w-10 bg-foreground" />
          {text.hero.eyebrow}
        </p>
        <h1
          id="hero-title"
          className={`${locale === "id" ? "max-w-[10ch]" : "max-w-[8ch]"} text-[clamp(3.7rem,7vw,6.7rem)] font-black leading-[0.86] tracking-[-0.08em]`}
        >
          {text.hero.headline}{" "}
          <span className="relative inline-block px-1 after:absolute after:inset-x-0 after:bottom-[0.03em] after:-z-10 after:h-[0.27em] after:-rotate-1 after:bg-primary">
            {text.hero.headlineAccent}
          </span>
        </h1>
        <p className="mt-8 max-w-[34rem] text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {text.hero.intro}
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="#join"
            className="inline-flex min-h-13 items-center justify-center gap-3 whitespace-nowrap border border-foreground bg-foreground px-6 font-black text-background shadow-[6px_6px_0_var(--primary)] transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 active:translate-y-px active:scale-[0.99]"
          >
            {text.hero.join} <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2.2} />
          </Link>
          <button
            type="button"
            onClick={replay}
            className="inline-flex min-h-13 items-center justify-center whitespace-nowrap border border-foreground bg-background px-6 font-black transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 active:translate-y-px active:scale-[0.99]"
          >
            {text.hero.demo}
          </button>
        </div>
      </div>

      <div
        className="relative grid min-h-[610px] place-items-center py-7 [perspective:1200px] max-sm:min-h-0 max-sm:pb-20"
        aria-label={text.hero.previewLabel}
      >
        <motion.div
          aria-hidden="true"
          className="absolute aspect-square w-[105%] max-w-[680px] rounded-full border border-border"
          animate={reducedMotion ? undefined : { rotate: 360 }}
          transition={reducedMotion ? undefined : { duration: 28, repeat: Infinity, ease: "linear" }}
        />

        <button
          type="button"
          onClick={replay}
          className="absolute left-0 top-0 z-20 inline-flex min-h-11 -translate-y-1/2 items-center gap-2 border border-[#111] bg-[#fffef9] px-3 text-xs font-black uppercase tracking-[0.08em] text-[#111] shadow-[4px_4px_0_var(--primary)] transition-transform hover:-translate-y-[55%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:left-auto max-sm:right-3 max-sm:top-1 max-sm:translate-y-0 max-sm:hover:-translate-y-0.5"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" strokeWidth={2.2} /> {text.hero.rerank}
        </button>

        <motion.article
          className="relative grid min-h-[535px] w-full max-w-[630px] grid-cols-[42%_58%] overflow-hidden border border-[#111] bg-[#fffef9] text-[#111] shadow-[12px_12px_0_color-mix(in_oklab,var(--foreground)_92%,transparent),0_28px_70px_rgb(17_17_17_/_0.18)] max-sm:min-h-0 max-sm:grid-cols-1"
          animate={
            reducedMotion
              ? { rotateY: 0, rotateX: 0, y: 0 }
              : { rotateY: [-4, -2, -4], rotateX: [2, 1, 2], y: [0, -9, 0] }
          }
          transition={reducedMotion ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          {!reducedMotion && (
            <motion.div
              aria-hidden="true"
              initial={{ y: "-125%", opacity: 0 }}
              animate={{ y: "405%", opacity: [0, 0.28, 0.52, 0.28, 0] }}
              transition={{
                duration: 1.35,
                repeat: Infinity,
                repeatDelay: 3.45,
                delay: 3.55,
                ease: [0.45, 0, 0.55, 1],
                times: [0, 0.18, 0.5, 0.82, 1],
              }}
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[32%] bg-gradient-to-b from-transparent via-primary/45 to-transparent"
            />
          )}

          <section className="bg-[#171717] p-5 text-[#fffef9] sm:p-6" aria-label={text.hero.taskListLabel}>
            <div className="mb-8 flex items-center justify-between">
              <span className="text-xs font-black tracking-[-0.03em]">{text.hero.today}</span>
              <span className="grid size-7 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">RA</span>
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#98958d]">{text.hero.date}</p>
            <h2 className="mb-4 mt-1 text-2xl font-black tracking-[-0.05em]">{text.hero.nextMoves}</h2>

            <div className="grid gap-2.5 max-sm:grid-cols-1">
              {orderedTasks.map((task, index) => {
                const active = task.id === scenario.active;
                return (
                  <motion.button
                    layout="position"
                    key={task.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectTask(task.id)}
                    className={
                      active
                        ? "grid w-full grid-cols-[26px_1fr_auto] items-center gap-2 border border-primary/45 bg-primary/10 p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        : "grid w-full grid-cols-[26px_1fr_auto] items-center gap-2 border border-white/15 bg-white/5 p-2.5 text-left transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    }
                    transition={{ type: "spring", stiffness: 165, damping: 23 }}
                  >
                    <span className="text-[10px] font-black text-primary">0{index + 1}</span>
                    <span className="text-xs font-bold leading-tight">
                      {task.name}
                      <span className="mt-1 block text-[9px] font-medium text-[#9b9991]">{task.time}</span>
                    </span>
                    <span className={active ? "grid size-8 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground" : "grid size-8 place-items-center rounded-full border border-white/20 text-[10px] font-black"}>
                      {active ? scenario.score : task.score}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div
              className="mt-5 flex items-center gap-2 text-[10px] font-bold text-[#aaa79f]"
              role="status"
              aria-live="polite"
            >
              <span aria-hidden="true" className="relative grid size-2.5 shrink-0 place-items-center">
                {!reducedMotion && isUpdating && (
                  <motion.span
                    className="absolute size-2 rounded-full bg-primary"
                    initial={{ scale: 0.7, opacity: 0.8 }}
                    animate={{ scale: 2.1, opacity: 0 }}
                    transition={{ duration: 0.55, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <motion.span
                  key={isUpdating ? "updating-dot" : "synced-dot"}
                  className={isUpdating ? "relative size-1.5 rounded-full bg-primary" : "relative size-1.5 rounded-full bg-[#42b576]"}
                  initial={reducedMotion ? false : { scale: 0.55, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: reducedMotion ? 0 : 0.22 }}
                />
              </span>
              <motion.span
                key={isUpdating ? "updating-status" : "synced-status"}
                initial={reducedMotion ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.2 }}
              >
                {isUpdating ? text.hero.updating : text.hero.synced}
              </motion.span>
            </div>
          </section>

          <section className="flex min-h-[535px] flex-col p-5 sm:p-6" aria-label={text.hero.analysisLabel}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#66645e]">{text.hero.brief}</span>
              <span className="inline-flex items-center gap-1.5 border border-black/15 px-2 py-1.5 text-[9px] font-black">
                <Sparkles aria-hidden="true" className="size-3" strokeWidth={2} /> {text.hero.analysisReady}
              </span>
            </div>

            <motion.div key={scenario.active} initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="mt-9 text-3xl font-black leading-none tracking-[-0.055em]">{scenario.title}</h2>
              <p className="mt-2 text-[11px] font-bold text-[#66645e]">{scenario.meta}</p>

              <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-3">
                <strong className="text-5xl font-black leading-none tracking-[-0.08em]">{scenario.score}</strong>
                <span className="text-[10px] leading-relaxed text-[#66645e]">{text.hero.priorityScore}<br />{text.hero.basedOn}</span>
                <div className="col-span-2 h-1 overflow-hidden bg-[#e0ddd4]" aria-hidden="true">
                  <motion.div
                    key={`meter-${scenario.active}`}
                    className="h-full origin-left bg-primary"
                    initial={reducedMotion ? { scaleX: scenario.score / 100 } : { scaleX: 0.35 }}
                    animate={{ scaleX: scenario.score / 100 }}
                    transition={reducedMotion ? { duration: 0 } : { duration: 0.72, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-2.5 max-[420px]:grid-cols-1">
                <div className="border border-black/15 bg-primary/25 p-3">
                  <strong className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em]">
                    <motion.span
                      aria-hidden="true"
                      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.28, delay: 0.16 }}
                    >
                      <ArrowUp className="size-3" strokeWidth={2.2} />
                    </motion.span>
                    {text.hero.upside}
                  </strong>
                  <p className="mt-2 text-[10px] leading-relaxed text-[#54514b]">{scenario.upside}</p>
                </div>
                <div className="border border-black/15 bg-black/5 p-3">
                  <strong className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em]">
                    <motion.span
                      aria-hidden="true"
                      initial={reducedMotion ? false : { opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.28, delay: 0.22 }}
                    >
                      <ArrowDown className="size-3" strokeWidth={2.2} />
                    </motion.span>
                    {text.hero.watchOut}
                  </strong>
                  <p className="mt-2 text-[10px] leading-relaxed text-[#54514b]">{scenario.risk}</p>
                </div>
              </div>
            </motion.div>

            <div className="mt-auto flex items-center justify-between border-t border-black/15 pt-4 text-[10px] font-bold text-[#66645e]">
              <span>{scenario.reminder}</span>
              <Bell aria-hidden="true" className="size-4 text-[#111]" strokeWidth={2} />
            </div>
          </section>
        </motion.article>

        <motion.aside
          key={scenario.signal}
          aria-live="polite"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-10 right-0 z-20 w-48 border border-[#111] bg-primary p-4 text-[#111] shadow-[7px_7px_0_#111] max-sm:bottom-3 max-sm:right-2"
        >
          <strong className="text-[10px] font-black uppercase tracking-[0.1em]">{text.hero.priorityShift}</strong>
          <p className="mt-1.5 text-xs font-extrabold leading-snug">{scenario.signal}</p>
        </motion.aside>
      </div>
    </section>
  );
}

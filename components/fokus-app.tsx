"use client";

import { AnimatePresence, motion, Reorder, useReducedMotion } from "framer-motion";
import {
  AlarmClock,
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  GripVertical,
  Inbox,
  ListFilter,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  ScanLine,
  Search,
  Settings,
  Sparkles,
  Star,
  SunMoon,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type TaskStatus = "open" | "in_progress" | "done";
type View = "today" | "all" | "upcoming" | "completed";
type Filter = "all" | TaskStatus;
type ReminderChannel = "In app" | "Email" | "Push";
type InsightKind = "upside" | "risk";
type InsightSource = "ai" | "human";
type ImpactScore = 1 | 2 | 3 | 4 | 5;
type Locale = "en" | "id";

type InsightItem = {
  id: string;
  text: string;
  source: InsightSource;
  starred: boolean;
  impact: ImpactScore;
};

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  dueLabel: string;
  dueGroup: "today" | "tomorrow" | "later";
  dueTime: string;
  priority: number;
  status: TaskStatus;
  starred: boolean;
  upsideItems: InsightItem[];
  riskItems: InsightItem[];
  signals: string[];
  reminder: string;
  channels: ReminderChannel[];
};

type WorkspaceSnapshot = {
  tasks: Task[];
  manualOrder: string[] | null;
  orderSource: "ai" | "manual";
  selectedId: string;
  locale: Locale;
};

type CachedWorkspace = {
  snapshot: WorkspaceSnapshot;
  pendingSync: boolean;
};

const WORKSPACE_ID_STORAGE_KEY = "fokus-workspace-id";
const WORKSPACE_CACHE_STORAGE_KEY = "fokus-workspace-cache";

const readCachedWorkspace = (): CachedWorkspace | null => {
  try {
    const rawValue = window.localStorage.getItem(WORKSPACE_CACHE_STORAGE_KEY);
    if (!rawValue) return null;
    const cached = JSON.parse(rawValue) as Partial<CachedWorkspace>;
    if (!cached.snapshot || !Array.isArray(cached.snapshot.tasks)) return null;
    return {
      snapshot: cached.snapshot,
      pendingSync: cached.pendingSync === true,
    };
  } catch {
    return null;
  }
};

const writeCachedWorkspace = (snapshot: WorkspaceSnapshot, pendingSync: boolean) => {
  try {
    window.localStorage.setItem(WORKSPACE_CACHE_STORAGE_KEY, JSON.stringify({ snapshot, pendingSync } satisfies CachedWorkspace));
  } catch {
    // Database persistence remains available when browser storage is disabled or full.
  }
};

const markCachedWorkspaceSaved = (savedSnapshot: WorkspaceSnapshot) => {
  const cached = readCachedWorkspace();
  if (!cached || JSON.stringify(cached.snapshot) !== JSON.stringify(savedSnapshot)) return;
  writeCachedWorkspace(savedSnapshot, false);
};

const tr = (locale: Locale, english: string, indonesian: string) => locale === "id" ? indonesian : english;

const indonesianContent: Record<string, string> = {
  "Send proposal deck": "Kirim presentasi proposal",
  "Final review, export the PDF, and send it to the client team.": "Tinjau versi akhir, ekspor PDF, lalu kirim ke tim klien.",
  "Client work": "Pekerjaan klien",
  "Today": "Hari ini",
  "Gets the client moving and keeps this week on track.": "Membantu klien segera bergerak dan menjaga rencana minggu ini tetap sesuai jalur.",
  "Finishing it now protects the rest of today's focus blocks.": "Menyelesaikannya sekarang menjaga sisa blok fokus hari ini.",
  "It clears the next dependency in the client work plan.": "Ini membuka dependensi berikutnya dalam rencana kerja klien.",
  "Needs 45 quiet minutes before your afternoon gets busy.": "Membutuhkan 45 menit tanpa gangguan sebelum sore menjadi sibuk.",
  "Waiting may compress the client's review window.": "Menunda dapat mempersempit waktu peninjauan klien.",
  "Exporting without a final link check could create another pass.": "Mengekspor tanpa pemeriksaan tautan terakhir dapat menambah putaran revisi.",
  "Due in 2h 14m": "Tenggat 2 jam 14 menit lagi",
  "High client impact": "Dampak tinggi bagi klien",
  "45 min effort": "Usaha 45 menit",
  "Check user feedback": "Periksa masukan pengguna",
  "Review the latest notes and pull themes into tomorrow's planning doc.": "Tinjau catatan terbaru dan rangkum temanya ke dokumen perencanaan besok.",
  "Product work": "Pekerjaan produk",
  "Tomorrow": "Besok",
  "Shows the biggest customer pain point before tomorrow's planning.": "Menunjukkan masalah pelanggan terbesar sebelum perencanaan besok.",
  "A short theme list can make the planning session more decisive.": "Daftar tema singkat dapat membuat sesi perencanaan lebih tegas.",
  "It can surface a quick product improvement before the next cycle.": "Dapat menemukan perbaikan produk cepat sebelum siklus berikutnya.",
  "Easy to overthink. Keep this review to 30 minutes.": "Mudah dianalisis berlebihan; batasi peninjauan ini hingga 30 menit.",
  "Outlier comments could distract from the repeated themes.": "Komentar yang menyimpang dapat mengalihkan perhatian dari tema berulang.",
  "Waiting until tomorrow leaves less time to validate the findings.": "Menunggu hingga besok menyisakan lebih sedikit waktu untuk memvalidasi temuan.",
  "8 notes to review": "8 catatan untuk ditinjau",
  "Planning tomorrow": "Perencanaan besok",
  "30 min effort": "Usaha 30 menit",
  "Today, 5:30 PM": "Hari ini, 17.30",
  "Send September invoice": "Kirim faktur September",
  "Check tracked hours and send the final invoice to Northstar Studio.": "Periksa jam kerja tercatat dan kirim faktur akhir ke Northstar Studio.",
  "Admin": "Administrasi",
  "Keeps cash flow on schedule before the monthly cutoff.": "Menjaga arus kas sesuai jadwal sebelum batas akhir bulanan.",
  "Sending it today gives the client time to resolve questions.": "Mengirimnya hari ini memberi klien waktu untuk menyelesaikan pertanyaan.",
  "It closes an admin loop before the next project block.": "Menuntaskan pekerjaan administrasi sebelum blok proyek berikutnya.",
  "Two time entries still need a quick check.": "Dua catatan waktu masih perlu diperiksa singkat.",
  "A rushed total could create a correction later.": "Total yang dihitung terburu-buru dapat memerlukan koreksi nanti.",
  "Missing the cutoff may delay the payment cycle.": "Melewati batas akhir dapat menunda siklus pembayaran.",
  "Due today": "Tenggat hari ini",
  "Revenue linked": "Terkait pendapatan",
  "20 min effort": "Usaha 20 menit",
  "Book dentist": "Buat janji dokter gigi",
  "Choose a Friday morning appointment before the remaining slots go.": "Pilih jadwal Jumat pagi sebelum slot yang tersisa habis.",
  "Personal": "Pribadi",
  "Friday": "Jumat",
  "Booking now gives you the best remaining slot this week.": "Memesan sekarang memberi Anda slot terbaik yang tersisa minggu ini.",
  "A confirmed time removes a small recurring mental reminder.": "Jadwal yang pasti menghilangkan pengingat kecil yang terus muncul.",
  "Choosing early makes it easier to plan Friday around the visit.": "Memilih lebih awal memudahkan perencanaan hari Jumat di sekitar kunjungan.",
  "It is quick, but it can interrupt a focus block.": "Tugas ini cepat, tetapi dapat mengganggu blok fokus.",
  "The preferred morning slots may disappear if you wait.": "Slot pagi pilihan dapat habis jika Anda menunggu.",
  "You may need insurance details before confirming.": "Anda mungkin memerlukan detail asuransi sebelum mengonfirmasi.",
  "Slots are limited": "Slot terbatas",
  "Low effort": "Usaha rendah",
  "Flexible time": "Waktu fleksibel",
  "Friday, 9:00 AM": "Jumat, 09.00",
  "Draft interview questions": "Susun pertanyaan wawancara",
  "Prepare a short guide for next week's customer conversations.": "Siapkan panduan singkat untuk percakapan pelanggan minggu depan.",
  "Research": "Riset",
  "Monday": "Senin",
  "Gives the team a consistent structure for five interviews.": "Memberi tim struktur yang konsisten untuk lima wawancara.",
  "Drafting early leaves time for the team to improve the prompts.": "Menyusun lebih awal memberi tim waktu untuk memperbaiki pertanyaan.",
  "A shared guide makes patterns easier to compare later.": "Panduan bersama membuat pola lebih mudah dibandingkan nanti.",
  "The recruiting criteria may still change.": "Kriteria perekrutan peserta mungkin masih berubah.",
  "Too many questions could reduce time for useful follow-ups.": "Terlalu banyak pertanyaan dapat mengurangi waktu untuk pertanyaan lanjutan.",
  "Unclear prompts may produce answers that are hard to compare.": "Pertanyaan yang kurang jelas dapat menghasilkan jawaban yang sulit dibandingkan.",
  "Due in 5 days": "Tenggat 5 hari lagi",
  "Team dependency": "Dependensi tim",
  "60 min effort": "Usaha 60 menit",
  "Sunday, 4:00 PM": "Minggu, 16.00",
  "Log travel expenses": "Catat biaya perjalanan",
  "Add last week's receipts and assign each item to the correct project.": "Tambahkan kuitansi minggu lalu dan tetapkan setiap item ke proyek yang benar.",
  "Completed": "Selesai",
  "Yesterday": "Kemarin",
  "Keeps the monthly books complete while the details are still fresh.": "Menjaga pembukuan bulanan lengkap saat detailnya masih mudah diingat.",
  "Categorizing now reduces cleanup at month end.": "Mengategorikannya sekarang mengurangi pekerjaan di akhir bulan.",
  "A complete record makes project reimbursement easier to verify.": "Catatan lengkap membuat penggantian biaya proyek lebih mudah diverifikasi.",
  "One taxi receipt may need a manual note.": "Satu kuitansi taksi mungkin memerlukan catatan manual.",
  "A missing project code could slow approval.": "Kode proyek yang hilang dapat memperlambat persetujuan.",
  "Waiting longer makes the receipt context harder to remember.": "Menunggu lebih lama membuat konteks kuitansi lebih sulit diingat.",
  "Finished yesterday": "Selesai kemarin",
  "12 receipts": "12 kuitansi",
  "No blocker": "Tanpa hambatan",
  "No reminder": "Tanpa pengingat",
  "Tomorrow, 8:30 AM": "Besok, 08.30",
  "Work": "Pekerjaan",
  "Next week": "Minggu depan",
  "New task": "Tugas baru",
  "Needs review": "Perlu ditinjau",
  "No description added yet.": "Belum ada deskripsi.",
};

const localizeContent = (locale: Locale, value: string) => locale === "id" ? (indonesianContent[value] ?? value) : value;

const localizeTime = (locale: Locale, value: string) => {
  if (locale !== "id") return value;
  return value
    .replace(/(\d{1,2}):(\d{2})\s*AM\b/g, (_, hour: string, minute: string) => `${String(Number(hour) % 12).padStart(2, "0")}.${minute}`)
    .replace(/(\d{1,2}):(\d{2})\s*PM\b/g, (_, hour: string, minute: string) => `${String((Number(hour) % 12) + 12).padStart(2, "0")}.${minute}`);
};

const localizeError = (locale: Locale, message: string, indonesianFallback: string) => locale === "id" ? indonesianFallback : message;

const getImpactLabels = (locale: Locale): Record<ImpactScore, string> => ({
  1: tr(locale, "Very low", "Sangat rendah"),
  2: tr(locale, "Low", "Rendah"),
  3: tr(locale, "Moderate", "Sedang"),
  4: tr(locale, "High", "Tinggi"),
  5: tr(locale, "Very high", "Sangat tinggi"),
});
const impactScores: ImpactScore[] = [1, 2, 3, 4, 5];
const impactTones: Record<ImpactScore, { className: string; borderColor: string }> = {
  1: { className: "bg-[var(--impact-1-bg)] text-[var(--impact-1-text)]", borderColor: "var(--impact-1-border)" },
  2: { className: "bg-[var(--impact-2-bg)] text-[var(--impact-2-text)]", borderColor: "var(--impact-2-border)" },
  3: { className: "bg-[var(--impact-3-bg)] text-[var(--impact-3-text)]", borderColor: "var(--impact-3-border)" },
  4: { className: "bg-[var(--impact-4-bg)] text-[var(--impact-4-text)]", borderColor: "var(--impact-4-border)" },
  5: { className: "bg-[var(--impact-5-bg)] text-[var(--impact-5-text)]", borderColor: "var(--impact-5-border)" },
};

const getDecisionScore = (task: Task) => {
  const prosTotal = task.upsideItems.reduce((total, item) => total + item.impact, 0);
  const consTotal = task.riskItems.reduce((total, item) => total + item.impact, 0);
  const impactTotal = prosTotal + consTotal;
  return {
    prosCount: task.upsideItems.length,
    consCount: task.riskItems.length,
    prosTotal,
    consTotal,
    score: impactTotal > 0 ? Math.round((prosTotal / impactTotal) * 100) : 0,
  };
};

const createAnalysisSlots = (taskId: string, kind: InsightKind): InsightItem[] =>
  Array.from({ length: 3 }, (_, index) => ({
    id: `${taskId}-${kind}-analysis-${index + 1}`,
    text: "",
    source: "ai",
    starred: false,
    impact: 3,
  }));

const prepareAnalysisItems = (taskId: string, kind: InsightKind, items: InsightItem[]) => {
  const retainedItems = items.filter((item) => item.source === "ai" || item.starred);
  const missingCount = Math.max(0, 3 - retainedItems.length);
  if (missingCount === 0) return retainedItems;

  const existingIds = new Set(retainedItems.map((item) => item.id));
  const generationSlots = createAnalysisSlots(taskId, kind)
    .filter((item) => !existingIds.has(item.id))
    .slice(0, missingCount);

  return [...retainedItems, ...generationSlots];
};

const createLocalId = (prefix: string) => {
  const uniquePart = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${uniquePart}`;
};

type AiInsightResult = { id: string; text: string; impact: number };

const toAiTask = (task: Task, locale: Locale) => ({
  id: task.id,
  title: localizeContent(locale, task.title),
  description: localizeContent(locale, task.description),
  category: localizeContent(locale, task.category),
  dueLabel: localizeContent(locale, task.dueLabel),
  dueTime: localizeTime(locale, task.dueTime),
  priority: task.priority,
  status: task.status,
  starred: task.starred,
});

const applyAiInsightRanking = (items: InsightItem[], results: AiInsightResult[]) => {
  const resultById = new Map(results.map((item) => [item.id, item]));
  const scored = items.map((item, index) => {
    const result = resultById.get(item.id);
    const canAnalyze = item.source === "ai" && !item.starred;
    const nextImpact = !item.starred && Number.isFinite(result?.impact)
      ? Math.round(Math.max(1, Math.min(5, Number(result?.impact)))) as ImpactScore
      : item.impact;
    return {
      item: {
        ...item,
        impact: nextImpact,
        ...(canAnalyze && result?.text?.trim() ? { text: result.text.trim() } : {}),
      },
      score: nextImpact,
      index,
    };
  });
  const ranked = scored
    .filter(({ item }) => !item.starred)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
  let rankedIndex = 0;

  return scored.map(({ item }) => {
    if (item.starred) return item;
    const rankedItem = ranked[rankedIndex];
    rankedIndex += 1;
    return rankedItem ?? item;
  });
};

const hasCompleteAiAnalysis = (items: InsightItem[], results: AiInsightResult[]) => {
  const resultById = new Map(results.map((item) => [item.id, item]));
  return items.every((item) => {
    const result = resultById.get(item.id);
    if (!result || !Number.isFinite(result.impact)) return false;
    return item.source !== "ai" || item.starred || Boolean(result.text?.trim());
  });
};

async function requestFocusAi<T>(payload: unknown) {
  const response = await fetch("/api/ai/focus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json() as { result?: T; model?: string; error?: string };
  if (!response.ok || !body.result) throw new Error(body.error || "The AI request failed.");
  return { result: body.result, model: body.model || "gemini-3.6-flash" };
}

const rerankTaskItems = (currentOrder: Task[], updatedTasks: Task[]) => {
  const updatedById = new Map(updatedTasks.map((task) => [task.id, task]));
  const ranked = updatedTasks
    .filter((task) => !task.starred)
    .sort((a, b) => b.priority - a.priority);
  let rankedIndex = 0;

  return currentOrder.map((task) => {
    const updatedTask = updatedById.get(task.id) ?? task;
    if (updatedTask.starred) return updatedTask.id;
    const nextTask = ranked[rankedIndex];
    rankedIndex += 1;
    return nextTask?.id ?? updatedTask.id;
  });
};

const initialTasks: Task[] = [];

const getNavItems = (locale: Locale): Array<{ id: View; label: string; icon: typeof Inbox }> => [
  { id: "today", label: tr(locale, "Today", "Hari ini"), icon: Inbox },
  { id: "all", label: tr(locale, "All tasks", "Semua tugas"), icon: ListFilter },
  { id: "upcoming", label: tr(locale, "Upcoming", "Mendatang"), icon: CalendarDays },
  { id: "completed", label: tr(locale, "Completed", "Selesai"), icon: CheckCircle2 },
];

const getStatusLabels = (locale: Locale): Record<TaskStatus, string> => ({
  open: tr(locale, "Open", "Terbuka"),
  in_progress: tr(locale, "In progress", "Dikerjakan"),
  done: tr(locale, "Done", "Selesai"),
});

function Logo() {
  return (
    <div className="inline-flex items-center gap-3" aria-label="Fokus">
      <span className="grid size-9 -rotate-6 place-items-center rounded-full bg-[#f2ff55] text-xs font-black text-[#171717] shadow-[3px_3px_0_#fffef9]">
        F
      </span>
      <span className="text-lg font-black tracking-[-0.045em]">FOKUS</span>
    </div>
  );
}

function EmptyState({ locale, onAdd }: { locale: Locale; onAdd: () => void }) {
  return (
    <div className="grid min-h-64 place-items-center border border-dashed border-white/20 bg-white/[0.04] p-3 text-center text-[#fffef9] sm:p-8">
      <div>
        <CheckCircle2 className="mx-auto size-8" strokeWidth={1.7} aria-hidden="true" />
        <h3 className="mt-4 text-sm font-black tracking-[-0.04em] sm:text-xl">{tr(locale, "Nothing here right now", "Belum ada tugas di sini")}</h3>
        <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-[#aaa79f] sm:text-sm">
          {tr(locale, "Change the filter or add a task to give Fokus something to sort.", "Ubah filter atau tambahkan tugas agar Fokus dapat menyusun prioritas.")}
        </p>
        <button
          type="button"
          onClick={onAdd}
          aria-label={tr(locale, "Add task", "Tambah tugas")}
          className="mt-5 inline-flex size-10 items-center justify-center gap-2 bg-[#f2ff55] text-xs font-black text-[#171717] transition-transform active:translate-y-px sm:min-h-11 sm:w-auto sm:px-4 sm:text-sm"
        >
          <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" /> <span className="hidden sm:inline">{tr(locale, "Add task", "Tambah tugas")}</span>
        </button>
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  index,
  locale,
  active,
  disabled,
  reducedMotion,
  onComplete,
  onSelect,
  onMove,
  onToggleStar,
}: {
  task: Task;
  index: number;
  locale: Locale;
  active: boolean;
  disabled: boolean;
  reducedMotion: boolean | null;
  onComplete: () => void;
  onSelect: () => void;
  onMove: (direction: -1 | 1) => void;
  onToggleStar: () => void;
}) {
  return (
    <Reorder.Item
      as="article"
      value={task.id}
      dragListener={!disabled}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileDrag={reducedMotion ? undefined : { scale: 1.015, zIndex: 20, boxShadow: "0 8px 0 rgba(242,255,85,0.2)" }}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
      className={active ? "relative grid w-full cursor-grab grid-cols-[20px_28px_minmax(0,1fr)] items-center gap-1 border border-[#f2ff55]/45 bg-[#2d3020] p-2 pr-7 text-left active:cursor-grabbing sm:grid-cols-[24px_36px_minmax(0,1fr)] sm:gap-2 sm:p-3 sm:pr-8 lg:grid-cols-[24px_40px_minmax(0,1fr)]" : "relative grid w-full cursor-grab grid-cols-[20px_28px_minmax(0,1fr)] items-center gap-1 border border-white/15 bg-[#212121] p-2 pr-7 text-left transition-colors hover:border-white/30 hover:bg-[#292929] active:cursor-grabbing sm:grid-cols-[24px_36px_minmax(0,1fr)] sm:gap-2 sm:p-3 sm:pr-8 lg:grid-cols-[24px_40px_minmax(0,1fr)]"}
    >
      <button
        type="button"
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          onMove(event.key === "ArrowUp" ? -1 : 1);
        }}
        className="grid size-5 touch-none place-items-center justify-self-start text-[#8e8b83] transition-colors hover:bg-white/10 hover:text-[#f2ff55] active:cursor-grabbing disabled:cursor-wait disabled:opacity-40 sm:size-6"
        aria-label={tr(locale, `Move ${task.title}. Drag anywhere on the card or use the up and down arrow keys.`, `Pindahkan ${localizeContent(locale, task.title)}. Seret kartu atau gunakan tombol panah atas dan bawah.`)}
      >
        <GripVertical className="size-4" strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={task.status === "done" ? tr(locale, `Reopen ${task.title}`, `Buka kembali ${localizeContent(locale, task.title)}`) : tr(locale, `Complete ${task.title}`, `Selesaikan ${localizeContent(locale, task.title)}`)}
        aria-pressed={task.status === "done"}
        onClick={onComplete}
        className={task.status === "done" ? "grid size-7 place-items-center rounded-full bg-[#f2ff55] text-[10px] font-black text-[#171717] sm:size-9 sm:text-xs lg:size-10" : "grid size-7 place-items-center rounded-full border border-white/25 bg-white/[0.04] text-[10px] font-black text-[#f2ff55] sm:size-9 sm:text-xs lg:size-10"}
      >
        {String(index + 1).padStart(2, "0")}
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="grid min-w-0 grid-cols-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6e72f] focus-visible:ring-offset-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3"
      >
        <span className="min-w-0">
          <span className={task.status === "done" ? "block text-[11px] font-black leading-tight text-[#8e8b83] line-through sm:text-sm lg:text-base" : "block text-[11px] font-black leading-tight text-[#fffef9] sm:text-sm lg:text-base"}>{localizeContent(locale, task.title)}</span>
          <span className="mt-1.5 hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#9b9991] md:flex">
            <span>{localizeContent(locale, task.category)}</span>
            <span className="inline-flex items-center gap-1"><Clock3 className="size-3" strokeWidth={2} aria-hidden="true" /> {localizeContent(locale, task.dueLabel)}, {localizeTime(locale, task.dueTime)}</span>
          </span>
        </span>
        <span className={active ? "grid size-7 place-items-center justify-self-start rounded-full bg-[#f2ff55] text-[10px] font-black text-[#171717] sm:mt-3 sm:size-9 sm:justify-self-auto sm:text-xs lg:size-11 lg:text-sm" : "grid size-7 place-items-center justify-self-start rounded-full border border-white/20 text-[10px] font-black text-[#fffef9] sm:mt-3 sm:size-9 sm:justify-self-auto sm:text-xs lg:size-11 lg:text-sm"} aria-label={`${tr(locale, "Priority score", "Skor prioritas")} ${task.priority}`}>
          {task.priority}
        </span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggleStar}
        aria-pressed={task.starred}
        aria-label={task.starred ? tr(locale, `Unpin ${task.title} from AI reranking`, `Lepaskan posisi ${localizeContent(locale, task.title)} dari penyusunan AI`) : tr(locale, `Pin ${task.title} during AI reranking`, `Pertahankan posisi ${localizeContent(locale, task.title)} saat AI menyusun ulang`)}
        title={task.starred ? tr(locale, "Pinned: task stays in this position", "Dipertahankan: tugas tetap di posisi ini") : tr(locale, "Pin task position", "Pertahankan posisi tugas")}
        className={task.starred ? "absolute right-1.5 top-1.5 grid size-5 place-items-center bg-transparent text-[#f2ff55] disabled:opacity-40 sm:right-2 sm:top-2" : "absolute right-1.5 top-1.5 grid size-5 place-items-center bg-transparent text-[#77746c] hover:text-[#f2ff55] disabled:opacity-40 sm:right-2 sm:top-2"}
      >
        <Star className={task.starred ? "size-3 fill-current" : "size-3"} strokeWidth={2} aria-hidden="true" />
      </button>
    </Reorder.Item>
  );
}

function SortableInsightItem({
  item,
  index,
  locale,
  disabled,
  reducedMotion,
  onMove,
  onToggleStar,
  onUpdate,
  onDelete,
}: {
  item: InsightItem;
  index: number;
  locale: Locale;
  disabled: boolean;
  reducedMotion: boolean | null;
  onMove: (direction: -1 | 1) => void;
  onToggleStar: () => void;
  onUpdate: (text: string, impact: ImpactScore) => void;
  onDelete: () => void;
}) {
  const impactLabels = getImpactLabels(locale);
  const [isEditingText, setIsEditingText] = useState(false);
  const [isEditingImpact, setIsEditingImpact] = useState(false);
  const [draft, setDraft] = useState(item.text);

  const saveEdit = () => {
    const nextText = draft.trim();
    if (!nextText) return;
    onUpdate(nextText, item.impact);
    setIsEditingText(false);
  };

  return (
    <Reorder.Item
      as="li"
      value={item.id}
      dragListener={!disabled && !isEditingText && !isEditingImpact}
      layout="position"
      whileDrag={reducedMotion ? undefined : { scale: 1.015, zIndex: 10, boxShadow: "5px 5px 0 rgba(23,23,23,0.16)" }}
      transition={{ duration: reducedMotion ? 0 : 0.18 }}
      className="relative grid cursor-grab grid-cols-[18px_minmax(0,1fr)] gap-1.5 border border-black/15 bg-[#fffef9]/85 p-2 pr-8 active:cursor-grabbing sm:grid-cols-[20px_minmax(0,1fr)] sm:gap-2 sm:p-2.5 sm:pr-9"
    >
      <button
        type="button"
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          onMove(event.key === "ArrowUp" ? -1 : 1);
        }}
        className="grid size-5 touch-none place-items-center text-[#77746c] hover:bg-black/5 hover:text-[#171717] active:cursor-grabbing disabled:cursor-wait disabled:opacity-40"
        aria-label={tr(locale, `Move item ${index + 1}. Drag anywhere on the card or use the up and down arrow keys.`, `Pindahkan item ${index + 1}. Seret kartu atau gunakan tombol panah atas dan bawah.`)}
      >
        <GripVertical className="size-4" strokeWidth={2} aria-hidden="true" />
      </button>

      <div className="min-w-0">
        {isEditingText ? (
          <div className="grid gap-2">
            <label className="sr-only" htmlFor={`edit-${item.id}`}>{tr(locale, "Edit statement", "Edit pernyataan")}</label>
            <textarea
              id={`edit-${item.id}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-[72px] w-full resize-y border border-black/25 bg-white p-2 text-xs leading-relaxed outline-none focus:border-black focus:ring-2 focus:ring-[#d6e72f]"
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={saveEdit} disabled={!draft.trim()} className="inline-flex min-h-8 items-center gap-1 bg-[#171717] px-2.5 text-[10px] font-black text-[#fffef9] disabled:opacity-40">
                <Check className="size-3.5" strokeWidth={2.2} aria-hidden="true" /> {tr(locale, "Save", "Simpan")}
              </button>
              <button type="button" onClick={() => { setDraft(localizeContent(locale, item.text)); setIsEditingText(false); }} className="min-h-8 border border-black/20 px-2.5 text-[10px] font-black hover:bg-black/5">{tr(locale, "Cancel", "Batal")}</button>
            </div>
          </div>
        ) : (
          <button type="button" disabled={disabled} onClick={() => { setDraft(localizeContent(locale, item.text)); setIsEditingImpact(false); setIsEditingText(true); }} className="block w-full cursor-text text-left text-xs leading-relaxed text-[#403e39] outline-none hover:underline hover:decoration-dotted focus-visible:ring-2 focus-visible:ring-[#d6e72f] disabled:cursor-wait disabled:no-underline sm:text-[13px]" aria-label={tr(locale, `Edit statement ${index + 1}`, `Edit pernyataan ${index + 1}`)}>
            {localizeContent(locale, item.text)}
          </button>
        )}

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.06em] text-[#66645e]">
              {item.source === "ai" ? <Sparkles className="size-3" strokeWidth={2} aria-hidden="true" /> : <UserRound className="size-3" strokeWidth={2} aria-hidden="true" />}
              {item.source === "ai" ? tr(locale, "AI generated", "Dibuat AI") : tr(locale, "Human", "Manusia")}
            </span>
            {isEditingImpact ? (
              <select
                value={item.impact}
                onChange={(event) => {
                  onUpdate(item.text, Number(event.target.value) as ImpactScore);
                  setIsEditingImpact(false);
                }}
                onBlur={() => setIsEditingImpact(false)}
                style={{ borderColor: impactTones[item.impact].borderColor }}
                className={`min-h-8 border px-2 text-[10px] font-black uppercase tracking-[0.04em] outline-none focus:ring-2 focus:ring-[#d6e72f] ${impactTones[item.impact].className}`}
                aria-label={tr(locale, `Edit impact for item ${index + 1}`, `Edit dampak item ${index + 1}`)}
                autoFocus
              >
                {impactScores.map((score) => <option key={score} value={score}>{score} · {impactLabels[score]}</option>)}
              </select>
            ) : (
              <button type="button" disabled={disabled || isEditingText} onClick={() => { setIsEditingText(false); setIsEditingImpact(true); }} style={{ borderColor: impactTones[item.impact].borderColor }} className={`border px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.04em] outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#d6e72f] disabled:cursor-wait ${impactTones[item.impact].className}`} aria-label={tr(locale, `Edit impact ${item.impact}: ${impactLabels[item.impact]}`, `Edit dampak ${item.impact}: ${impactLabels[item.impact]}`)}>
                {tr(locale, "Impact", "Dampak")} {item.impact} · {impactLabels[item.impact]}
              </button>
            )}
          </span>
          {!isEditingText && (
            <span className="flex items-center gap-1">
              <button type="button" disabled={disabled} onClick={onDelete} className="grid size-6 place-items-center border border-black/15 text-destructive hover:bg-destructive/10 disabled:opacity-40" aria-label={tr(locale, `Delete item ${index + 1}`, `Hapus item ${index + 1}`)}>
                <Trash2 className="size-3" strokeWidth={2} aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onToggleStar}
        aria-pressed={item.starred}
        aria-label={item.starred ? tr(locale, `Allow AI to update item ${index + 1}`, `Izinkan AI memperbarui item ${index + 1}`) : tr(locale, `Protect item ${index + 1} during AI analysis`, `Lindungi item ${index + 1} saat analisis AI`)}
        title={item.starred ? tr(locale, "Protected: text, impact, and position stay fixed", "Dilindungi: teks, dampak, dan posisi tidak berubah") : tr(locale, "Protect from AI changes", "Lindungi dari perubahan AI")}
        className={item.starred ? "absolute right-1.5 top-1.5 grid size-6 place-items-center bg-transparent text-primary disabled:opacity-40 sm:right-2 sm:top-2" : "absolute right-1.5 top-1.5 grid size-6 place-items-center bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-40 sm:right-2 sm:top-2"}
      >
        <Star className={item.starred ? "size-3.5 fill-[#f2ff55]" : "size-3.5"} strokeWidth={2} aria-hidden="true" />
      </button>
    </Reorder.Item>
  );
}

function InsightList({
  kind,
  title,
  items,
  query,
  locale,
  disabled,
  reducedMotion,
  onChange,
}: {
  kind: InsightKind;
  title: string;
  items: InsightItem[];
  query: string;
  locale: Locale;
  disabled: boolean;
  reducedMotion: boolean | null;
  onChange: (items: InsightItem[]) => void;
}) {
  const titleId = `${kind}-insight-title`;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = normalizedQuery
    ? items.filter((item) => `${item.text} ${localizeContent(locale, item.text)}`.toLowerCase().includes(normalizedQuery))
    : items;

  const reorderItems = (nextIds: string[]) => {
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    const nextVisibleItems = nextIds.map((id) => itemMap.get(id)).filter((item): item is InsightItem => Boolean(item));
    let visibleIndex = 0;
    onChange(items.map((item) => {
      if (!visibleIds.has(item.id)) return item;
      const nextItem = nextVisibleItems[visibleIndex];
      visibleIndex += 1;
      return nextItem ?? item;
    }));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= visibleItems.length) return;
    const currentItemIndex = items.findIndex((item) => item.id === visibleItems[index].id);
    const targetItemIndex = items.findIndex((item) => item.id === visibleItems[nextIndex].id);
    if (currentItemIndex < 0 || targetItemIndex < 0) return;
    const nextItems = [...items];
    [nextItems[currentItemIndex], nextItems[targetItemIndex]] = [nextItems[targetItemIndex], nextItems[currentItemIndex]];
    onChange(nextItems);
  };

  return (
    <section className={kind === "upside" ? "border border-black/15 bg-[#f2ff55]/35 p-2.5 sm:p-3" : "border border-black/15 bg-black/[0.035] p-2.5 sm:p-3"} aria-labelledby={titleId}>
      <div className="flex items-center gap-2">
        <span id={titleId} className="flex min-w-0 items-center gap-2 text-[11px] font-black uppercase tracking-[0.07em] sm:text-xs">
          {kind === "upside" ? <ArrowUp className="size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" /> : <ArrowDown className="size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />}
          <span>{title}</span>
        </span>
      </div>

      {visibleItems.length > 0 ? (
        <Reorder.Group as="ol" axis="y" values={visibleItems.map((item) => item.id)} onReorder={reorderItems} className="mt-2.5 grid gap-1.5" aria-label={`${title} ${tr(locale, "statements", "pernyataan")}`}>
          {visibleItems.map((item, index) => (
            <SortableInsightItem
              key={item.id}
              item={item}
              index={index}
              locale={locale}
              disabled={disabled}
              reducedMotion={reducedMotion}
              onMove={(direction) => moveItem(index, direction)}
              onToggleStar={() => onChange(items.map((current) => current.id === item.id ? { ...current, starred: !current.starred } : current))}
              onUpdate={(text, impact) => onChange(items.map((current) => current.id === item.id ? { ...current, text, impact, source: "human" } : current))}
              onDelete={() => onChange(items.filter((current) => current.id !== item.id))}
            />
          ))}
        </Reorder.Group>
      ) : (
        <div className="mt-3 border border-dashed border-black/20 bg-[#fffef9]/60 p-4 text-center text-xs leading-relaxed text-[#66645e]">
          {normalizedQuery
            ? tr(locale, "No decisions match your search.", "Tidak ada keputusan yang cocok dengan pencarian.")
            : tr(locale, "No decisions yet. Analyze the task or add one.", "Belum ada keputusan. Analisis tugas atau tambahkan satu.")}
        </div>
      )}
    </section>
  );
}

function TaskDialog({ locale, open, task, onClose, onSave }: { locale: Locale; open: boolean; task: Task | null; onClose: () => void; onSave: (task: Task) => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description === "No description added yet." ? "" : task?.description ?? "");
  const [category, setCategory] = useState(task?.category ?? "Work");
  const [due, setDue] = useState<"today" | "tomorrow" | "later">(task?.dueGroup ?? "today");
  const [error, setError] = useState("");
  const titleInput = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const isEditing = task !== null;

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => titleInput.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!title.trim()) {
      setError(tr(locale, "Add a task title first.", "Tambahkan judul tugas terlebih dahulu."));
      return;
    }

    submittingRef.current = true;
    const dueLabels = {
      today: "Today",
      tomorrow: "Tomorrow",
      later: "Next week",
    } as const;
    const taskId = task?.id ?? createLocalId("local");
    const dueChanged = Boolean(task && task.dueGroup !== due);
    const nextSignals = task
      ? task.signals.map((signal) => signal === task.dueLabel ? dueLabels[due] : signal)
      : [dueLabels[due], "New task", "Needs review"];
    onSave({
      ...(task ?? ({} as Task)),
      id: taskId,
      title: title.trim(),
      description: description.trim() || "No description added yet.",
      category,
      dueLabel: dueLabels[due],
      dueGroup: due,
      dueTime: dueChanged || !task ? (due === "today" ? "6:00 PM" : "9:00 AM") : task.dueTime,
      priority: task?.priority ?? 0,
      status: task?.status ?? "open",
      starred: task?.starred ?? false,
      upsideItems: task?.upsideItems ?? [],
      riskItems: task?.riskItems ?? [],
      signals: nextSignals,
      reminder: dueChanged || !task ? (due === "today" ? "5:15 PM" : "Tomorrow, 8:30 AM") : task.reminder,
      channels: task?.channels ?? ["In app"],
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 grid place-items-end bg-[#171717]/55 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-dialog-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="theme-surface w-full max-w-xl border border-foreground shadow-[10px_10px_0_#f2ff55]"
          >
            <div className="flex items-center justify-between border-b border-black/15 p-5 sm:p-6">
              <div>
                <h2 id="task-dialog-title" className="text-2xl font-black tracking-[-0.045em]">{isEditing ? tr(locale, "Edit task", "Edit tugas") : tr(locale, "Add a task", "Tambah tugas")}</h2>
                <p className="mt-1 text-sm text-[#66645e]">{tr(locale, "Changes are saved securely to your workspace.", "Perubahan disimpan dengan aman ke workspace Anda.")}</p>
              </div>
              <button type="button" onClick={onClose} className="grid size-11 place-items-center border border-black/15 hover:bg-black/5" aria-label={tr(locale, "Close dialog", "Tutup dialog")}>
                <X className="size-5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6" noValidate>
              <label className="grid gap-2 text-sm font-black">
                {tr(locale, "Task title", "Judul tugas")}
                <input
                  ref={titleInput}
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    if (error) setError("");
                  }}
                  className="min-h-12 border border-black/25 bg-white px-4 font-medium outline-none placeholder:text-[#77746c] focus:border-black focus:ring-2 focus:ring-[#d6e72f]"
                  placeholder={tr(locale, "What needs to get done?", "Apa yang perlu diselesaikan?")}
                  aria-describedby={error ? "task-title-error" : undefined}
                  aria-invalid={Boolean(error)}
                />
                {error && <span id="task-title-error" className="text-sm font-bold text-destructive">{error}</span>}
              </label>

              <label className="grid gap-2 text-sm font-black">
                {tr(locale, "Description", "Deskripsi")}
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-24 resize-y border border-black/25 bg-white px-4 py-3 font-medium leading-relaxed outline-none placeholder:text-[#77746c] focus:border-black focus:ring-2 focus:ring-[#d6e72f]"
                  placeholder={tr(locale, "Add a little context", "Tambahkan sedikit konteks")}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-black">
                  {tr(locale, "Category", "Kategori")}
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-12 border border-black/25 bg-white px-3 font-medium outline-none focus:border-black focus:ring-2 focus:ring-[#d6e72f]">
                    <option value="Work">{tr(locale, "Work", "Pekerjaan")}</option>
                    <option value="Client work">{tr(locale, "Client work", "Pekerjaan klien")}</option>
                    <option value="Admin">{tr(locale, "Admin", "Administrasi")}</option>
                    <option value="Personal">{tr(locale, "Personal", "Pribadi")}</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black">
                  {tr(locale, "Due", "Tenggat")}
                  <select value={due} onChange={(event) => setDue(event.target.value as typeof due)} className="min-h-12 border border-black/25 bg-white px-3 font-medium outline-none focus:border-black focus:ring-2 focus:ring-[#d6e72f]">
                    <option value="today">{tr(locale, "Today", "Hari ini")}</option>
                    <option value="tomorrow">{tr(locale, "Tomorrow", "Besok")}</option>
                    <option value="later">{tr(locale, "Next week", "Minggu depan")}</option>
                  </select>
                </label>
              </div>

              <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="min-h-12 border border-black/25 px-5 font-black hover:bg-black/5 active:translate-y-px">{tr(locale, "Cancel", "Batal")}</button>
                <button type="submit" className="min-h-12 bg-[#171717] px-5 font-black text-[#fffef9] shadow-[4px_4px_0_#f2ff55] transition-transform hover:-translate-y-0.5 active:translate-y-px">{isEditing ? tr(locale, "Save changes", "Simpan perubahan") : tr(locale, "Add task", "Tambah tugas")}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FokusApp() {
  const reducedMotion = useReducedMotion();
  const [tasks, setTasks] = useState(initialTasks);
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  const [orderSource, setOrderSource] = useState<"ai" | "manual">("ai");
  const [locale, setLocale] = useState<Locale>("en");
  const [view, setView] = useState<View>("today");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [decisionQuery, setDecisionQuery] = useState("");
  const [isAddingDecision, setIsAddingDecision] = useState(false);
  const [newDecisionKind, setNewDecisionKind] = useState<InsightKind>("upside");
  const [newDecisionText, setNewDecisionText] = useState("");
  const [newDecisionImpact, setNewDecisionImpact] = useState<ImpactScore>(3);
  const [selectedId, setSelectedId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isReranking, setIsReranking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiError, setAiError] = useState("");
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [workspaceError, setWorkspaceError] = useState("");

  const navItems = useMemo(() => getNavItems(locale), [locale]);
  const statusLabels = useMemo(() => getStatusLabels(locale), [locale]);
  const impactLabels = useMemo(() => getImpactLabels(locale), [locale]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const currentTheme = root.dataset.theme;
    const isDark = currentTheme === "dark"
      || (currentTheme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const nextTheme = isDark ? "light" : "dark";
    root.dataset.theme = nextTheme;
    window.localStorage.setItem("fokus-theme", nextTheme);
  };

  useEffect(() => {
    let cancelled = false;

    const loadWorkspace = async () => {
      const cachedWorkspace = readCachedWorkspace();
      const storedWorkspaceId = window.localStorage.getItem(WORKSPACE_ID_STORAGE_KEY) ?? "";
      if (storedWorkspaceId) setWorkspaceId(storedWorkspaceId);

      try {
        const response = await fetch("/api/workspace", {
          cache: "no-store",
          headers: storedWorkspaceId ? { "X-Fokus-Workspace-Id": storedWorkspaceId } : undefined,
        });
        const body = await response.json() as { workspace?: WorkspaceSnapshot | null; workspaceId?: string; error?: string };
        if (!response.ok) throw new Error(body.error || "The workspace could not be loaded.");
        if (cancelled) return;

        if (body.workspaceId) {
          setWorkspaceId(body.workspaceId);
          window.localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, body.workspaceId);
        }

        const nextWorkspace = cachedWorkspace?.pendingSync
          ? cachedWorkspace.snapshot
          : body.workspace ?? cachedWorkspace?.snapshot;
        if (!nextWorkspace) return;

        setTasks(nextWorkspace.tasks);
        setManualOrder(nextWorkspace.manualOrder);
        setOrderSource(nextWorkspace.orderSource);
        setSelectedId(nextWorkspace.selectedId || nextWorkspace.tasks[0]?.id || "");
        setLocale(nextWorkspace.locale);
      } catch (error) {
        if (!cancelled) {
          if (cachedWorkspace) {
            setTasks(cachedWorkspace.snapshot.tasks);
            setManualOrder(cachedWorkspace.snapshot.manualOrder);
            setOrderSource(cachedWorkspace.snapshot.orderSource);
            setSelectedId(cachedWorkspace.snapshot.selectedId || cachedWorkspace.snapshot.tasks[0]?.id || "");
            setLocale(cachedWorkspace.snapshot.locale);
          }
          setWorkspaceError(error instanceof Error ? error.message : "The workspace could not be loaded.");
        }
      } finally {
        if (!cancelled) setWorkspaceLoaded(true);
      }
    };

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!workspaceLoaded) return;

    writeCachedWorkspace({ tasks, manualOrder, orderSource, selectedId, locale }, true);
  }, [locale, manualOrder, orderSource, selectedId, tasks, workspaceLoaded]);

  useEffect(() => {
    if (!workspaceLoaded) return;

    const saveTimer = window.setTimeout(async () => {
      const snapshot = { tasks, manualOrder, orderSource, selectedId, locale } satisfies WorkspaceSnapshot;
      setSaveStatus("saving");
      setWorkspaceError("");
      try {
        const response = await fetch("/api/workspace", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(workspaceId ? { "X-Fokus-Workspace-Id": workspaceId } : {}),
          },
          body: JSON.stringify(snapshot),
        });
        const body = await response.json() as { workspaceId?: string; error?: string };
        if (!response.ok) throw new Error(body.error || "The workspace could not be saved.");
        if (body.workspaceId) {
          setWorkspaceId(body.workspaceId);
          window.localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, body.workspaceId);
        }
        markCachedWorkspaceSaved(snapshot);
        setSaveStatus("saved");
      } catch (error) {
        setSaveStatus("error");
        setWorkspaceError(error instanceof Error ? error.message : "The workspace could not be saved.");
      }
    }, 650);

    return () => window.clearTimeout(saveTimer);
  }, [locale, manualOrder, orderSource, selectedId, tasks, workspaceId, workspaceLoaded]);

  useEffect(() => {
    if (!workspaceLoaded) return;

    const flushWorkspace = () => {
      const snapshot = { tasks, manualOrder, orderSource, selectedId, locale } satisfies WorkspaceSnapshot;
      void fetch("/api/workspace", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(workspaceId ? { "X-Fokus-Workspace-Id": workspaceId } : {}),
        },
        body: JSON.stringify(snapshot),
        keepalive: true,
      });
    };

    window.addEventListener("pagehide", flushWorkspace);
    return () => window.removeEventListener("pagehide", flushWorkspace);
  }, [locale, manualOrder, orderSource, selectedId, tasks, workspaceId, workspaceLoaded]);

  const selectedTask = tasks.find((task) => task.id === selectedId) ?? tasks[0];
  const counts = useMemo(
    () => ({
      today: tasks.filter((task) => task.dueGroup === "today" && task.status !== "done").length,
      all: tasks.filter((task) => task.status !== "done").length,
      upcoming: tasks.filter((task) => task.dueGroup !== "today" && task.status !== "done").length,
      completed: tasks.filter((task) => task.status === "done").length,
    }),
    [tasks],
  );

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const manualPositions = new Map((manualOrder ?? []).map((id, index) => [id, index]));
    return tasks
      .filter((task) => {
        if (view === "today" && (task.dueGroup !== "today" || task.status === "done")) return false;
        if (view === "all" && task.status === "done") return false;
        if (view === "upcoming" && (task.dueGroup === "today" || task.status === "done")) return false;
        if (view === "completed" && task.status !== "done") return false;
        if (filter !== "all" && task.status !== filter) return false;
        if (normalizedQuery && !`${localizeContent(locale, task.title)} ${localizeContent(locale, task.description)} ${localizeContent(locale, task.category)}`.toLowerCase().includes(normalizedQuery)) return false;
        return true;
      })
      .sort((a, b) => {
        if (!manualOrder) return b.priority - a.priority;
        return (manualPositions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (manualPositions.get(b.id) ?? Number.MAX_SAFE_INTEGER);
      });
  }, [filter, locale, manualOrder, query, tasks, view]);

  const changeView = (nextView: View) => {
    setView(nextView);
    setFilter("all");
    setMobileMenuOpen(false);
  };

  const rerank = async () => {
    if (isReranking) return;
    setIsReranking(true);
    setAiError("");
    try {
      const { result } = await requestFocusAi<{ tasks: Array<{ id: string; priority: number }> }>({
        action: "rerank",
        locale,
        tasks: tasks.map((task) => toAiTask(task, locale)),
      });
      const scores = new Map((Array.isArray(result.tasks) ? result.tasks : []).map((task) => [task.id, task.priority]));
      const manualPositions = new Map((manualOrder ?? []).map((id, index) => [id, index]));
      const currentOrder = [...tasks].sort((a, b) => manualOrder
        ? (manualPositions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (manualPositions.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        : b.priority - a.priority);
      const updatedTasks = tasks.map((task) => {
        const nextScore = Number(scores.get(task.id));
        if (task.status === "done" || !Number.isFinite(nextScore)) return task;
        return { ...task, priority: Math.round(Math.max(0, Math.min(100, nextScore))) };
      });
      setTasks(updatedTasks);
      setManualOrder(rerankTaskItems(currentOrder, updatedTasks));
      setOrderSource("ai");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "The AI request failed.");
    } finally {
      setIsReranking(false);
    }
  };

  const updateTask = (id: string, patch: Partial<Task>) => {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  };

  const sortSelectedDecisionsByImpact = (direction: "asc" | "desc") => {
    if (!selectedTask) return;
    const sortItems = (items: InsightItem[]) => [...items].sort((left, right) => direction === "asc"
      ? left.impact - right.impact
      : right.impact - left.impact);

    updateTask(selectedTask.id, {
      upsideItems: sortItems(selectedTask.upsideItems),
      riskItems: sortItems(selectedTask.riskItems),
    });
  };

  const addDecision = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTask) return;
    const text = newDecisionText.trim();
    if (!text) return;

    const item: InsightItem = {
      id: createLocalId(`${newDecisionKind}-human`),
      text,
      source: "human",
      starred: false,
      impact: newDecisionImpact,
    };

    updateTask(selectedTask.id, newDecisionKind === "upside"
      ? { upsideItems: [...selectedTask.upsideItems, item] }
      : { riskItems: [...selectedTask.riskItems, item] });
    setNewDecisionText("");
    setNewDecisionImpact(3);
    setIsAddingDecision(false);
  };

  const analyzeBrief = async () => {
    if (!selectedTask || isAnalyzing) return;
    const taskSnapshot = selectedTask;
    const upsideItems = prepareAnalysisItems(taskSnapshot.id, "upside", taskSnapshot.upsideItems);
    const riskItems = prepareAnalysisItems(taskSnapshot.id, "risk", taskSnapshot.riskItems);
    setIsAnalyzing(true);
    setAiError("");
    try {
      const { result } = await requestFocusAi<{ upside: AiInsightResult[]; risks: AiInsightResult[] }>({
        action: "analyze",
        locale,
        task: toAiTask(taskSnapshot, locale),
        upsideItems: upsideItems.map((item) => ({ ...item, text: localizeContent(locale, item.text) })),
        riskItems: riskItems.map((item) => ({ ...item, text: localizeContent(locale, item.text) })),
      });
      const upsideResults = Array.isArray(result.upside) ? result.upside : [];
      const riskResults = Array.isArray(result.risks) ? result.risks : [];
      if (!hasCompleteAiAnalysis(upsideItems, upsideResults) || !hasCompleteAiAnalysis(riskItems, riskResults)) {
        throw new Error("The AI returned an incomplete analysis. Please try again.");
      }
      setTasks((current) => current.map((task) => task.id === taskSnapshot.id ? {
        ...task,
        upsideItems: applyAiInsightRanking(upsideItems, upsideResults),
        riskItems: applyAiInsightRanking(riskItems, riskResults),
      } : task));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "The AI request failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectTask = (id: string) => {
    setSelectedId(id);
    setDecisionQuery("");
    setIsAddingDecision(false);
    setNewDecisionText("");
    setNewDecisionImpact(3);
  };

  const addTask = (task: Task) => {
    setTasks((current) => current.some((item) => item.id === task.id) ? current : [task, ...current]);
    setManualOrder((current) => current ? [task.id, ...current.filter((id, index, order) => id !== task.id && order.indexOf(id) === index)] : null);
    selectTask(task.id);
    setView((current) => {
      if (current === "all") return current;
      return task.dueGroup === "today" ? "today" : "upcoming";
    });
    setFilter((current) => current === "all" || current === "open" ? current : "open");
    setQuery("");
    setIsAdding(false);
  };

  const saveTaskEdits = (task: Task) => {
    setTasks((current) => current.map((item) => item.id === task.id ? task : item));
    setEditingTask(null);
  };

  const deleteTask = (id: string) => {
    const remaining = tasks.filter((task) => task.id !== id);
    setTasks(remaining);
    setManualOrder((current) => current?.filter((taskId) => taskId !== id) ?? null);
    selectTask(remaining[0]?.id ?? "");
  };

  const toggleChannel = (channel: ReminderChannel) => {
    if (!selectedTask) return;
    const channels = selectedTask.channels.includes(channel)
      ? selectedTask.channels.filter((item) => item !== channel)
      : [...selectedTask.channels, channel];
    updateTask(selectedTask.id, { channels });
  };

  const reorderVisibleTasks = (nextVisibleOrder: string[]) => {
    const visibleIds = new Set(visibleTasks.map((task) => task.id));
    const sanitizedVisibleOrder = [...new Set(nextVisibleOrder)].filter((id) => visibleIds.has(id));
    setOrderSource("manual");
    setManualOrder((current) => {
      const rankedOrder = [...tasks].sort((a, b) => b.priority - a.priority).map((task) => task.id);
      const baseOrder = [...new Set(current ?? rankedOrder)].filter((id) => tasks.some((task) => task.id === id));
      const missingIds = tasks.map((task) => task.id).filter((id) => !baseOrder.includes(id));
      let visibleIndex = 0;

      return [...baseOrder, ...missingIds].map((id) => {
        if (!visibleIds.has(id)) return id;
        const replacement = sanitizedVisibleOrder[visibleIndex];
        visibleIndex += 1;
        return replacement ?? id;
      });
    });
  };

  const moveVisibleTask = (id: string, direction: -1 | 1) => {
    const visibleOrder = visibleTasks.map((task) => task.id);
    const currentIndex = visibleOrder.indexOf(id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= visibleOrder.length) return;
    [visibleOrder[currentIndex], visibleOrder[nextIndex]] = [visibleOrder[nextIndex], visibleOrder[currentIndex]];
    reorderVisibleTasks(visibleOrder);
  };

  const currentViewLabel = navItems.find((item) => item.id === view)?.label ?? tr(locale, "Tasks", "Tugas");
  const isProcessing = isReranking || isAnalyzing;
  const decisionScore = selectedTask ? getDecisionScore(selectedTask) : { score: 0, prosCount: 0, consCount: 0, prosTotal: 0, consTotal: 0 };
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="relative min-h-[100dvh] w-full">
        <div
          aria-hidden="true"
          onMouseEnter={() => setSidebarHovered(true)}
          className={`fixed inset-y-0 left-0 z-40 hidden w-5 xl:block ${sidebarHovered ? "pointer-events-none" : "pointer-events-auto after:absolute after:left-0 after:top-1/2 after:h-16 after:w-1 after:-translate-y-1/2 after:bg-[#f2ff55] after:opacity-70"}`}
        />
        <aside
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          aria-hidden={!sidebarHovered}
          inert={!sidebarHovered}
          className={`fixed inset-y-0 left-0 z-30 hidden w-[248px] overflow-hidden border-r border-white/10 bg-[#171717] p-5 text-[#fffef9] transition-[transform,opacity] duration-200 xl:flex xl:flex-col ${sidebarHovered ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-full opacity-0"}`}
        >
          <div className="flex h-14 items-center px-2"><Logo /></div>

          <nav className="mt-8 grid gap-1" aria-label={tr(locale, "Task views", "Tampilan tugas")}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeView(item.id)}
                  className={active ? "grid min-h-12 grid-cols-[22px_1fr_auto] items-center gap-3 bg-[#f2ff55] px-3 text-left font-black text-[#171717]" : "grid min-h-12 grid-cols-[22px_1fr_auto] items-center gap-3 px-3 text-left font-bold text-[#aaa79f] transition-colors hover:bg-white/8 hover:text-white"}
                >
                  <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
                  <span>{item.label}</span>
                  <span className={active ? "text-xs" : "text-xs text-[#77746c]"}>{counts[item.id]}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-white/10 pt-7">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#77746c]">{tr(locale, "Workspace", "Ruang kerja")}</p>
            <div className="mt-3 grid gap-1">
              <button type="button" className="flex min-h-11 items-center gap-3 px-3 text-left text-sm font-bold text-[#aaa79f] hover:bg-white/8 hover:text-white">
                <Bell className="size-[18px]" strokeWidth={1.9} aria-hidden="true" /> {tr(locale, "Reminders", "Pengingat")}
              </button>
              <button type="button" className="flex min-h-11 items-center gap-3 px-3 text-left text-sm font-bold text-[#aaa79f] hover:bg-white/8 hover:text-white">
                <Settings className="size-[18px]" strokeWidth={1.9} aria-hidden="true" /> {tr(locale, "Preferences", "Preferensi")}
              </button>
            </div>
          </div>

          <div className="mt-auto border border-white/15 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-[#f2ff55] text-xs font-black text-[#171717]">RA</span>
              <span className="min-w-0">
                <strong className="block truncate text-sm">Raisa Aditya</strong>
                <span className="block truncate text-xs text-[#8e8b83]">{tr(locale, "Solo plan", "Paket solo")}</span>
              </span>
              <MoreHorizontal className="ml-auto size-5 text-[#8e8b83]" strokeWidth={1.8} aria-hidden="true" />
            </div>
          </div>
        </aside>

        <section className={`min-w-0 transition-[padding] duration-300 ${sidebarHovered ? "xl:pl-[248px]" : "xl:pl-0"}`}>
          <header className="theme-surface sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-border px-4 backdrop-blur-md sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="grid size-11 place-items-center bg-[#171717] text-[#fffef9] xl:hidden"
              aria-expanded={mobileMenuOpen}
              aria-label={tr(locale, "Open navigation", "Buka navigasi")}
            >
              {mobileMenuOpen ? <X className="size-5" strokeWidth={2} /> : <Menu className="size-5" strokeWidth={2} />}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="grid size-10 shrink-0 place-items-center border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={tr(locale, "Toggle light or dark theme", "Ubah tema terang atau gelap")}
                title={tr(locale, "Toggle theme", "Ubah tema")}
              >
                <SunMoon className="size-4.5" strokeWidth={2} aria-hidden="true" />
              </button>
              <div className="flex border border-black/15 p-0.5" role="group" aria-label={tr(locale, "Language", "Bahasa")}> 
                {(["en", "id"] as Locale[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={locale === option}
                    onClick={() => setLocale(option)}
                    className={locale === option ? "min-h-8 min-w-8 bg-[#171717] px-2 text-[10px] font-black uppercase text-[#fffef9]" : "min-h-8 min-w-8 px-2 text-[10px] font-black uppercase text-[#66645e] hover:bg-black/5"}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <span className="hidden border border-black/15 px-3 py-2 text-xs font-bold text-[#66645e] md:inline-flex">{tr(locale, "Saved workspace", "Ruang kerja tersimpan")}</span>
              <button type="button" className="relative grid size-11 place-items-center border border-black/15 bg-white hover:bg-black/5" aria-label={tr(locale, "Notifications", "Notifikasi")}>
                <Bell className="size-5" strokeWidth={1.9} aria-hidden="true" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" aria-hidden="true" />
              </button>
              <button type="button" className="grid size-11 place-items-center rounded-full bg-[#171717] text-xs font-black text-[#f2ff55]" aria-label={tr(locale, "Open profile", "Buka profil")}>RA</button>
            </div>
          </header>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.nav
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="fixed inset-x-4 top-20 z-30 border border-[#171717] bg-[#171717] p-3 text-[#fffef9] shadow-[7px_7px_0_#f2ff55] xl:hidden"
                aria-label={tr(locale, "Mobile task views", "Tampilan tugas seluler")}
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} type="button" onClick={() => changeView(item.id)} className={view === item.id ? "flex min-h-12 w-full items-center gap-3 bg-[#f2ff55] px-3 font-black text-[#171717]" : "flex min-h-12 w-full items-center gap-3 px-3 font-bold text-[#aaa79f]"}>
                      <Icon className="size-5" strokeWidth={1.9} aria-hidden="true" />
                      {item.label}
                      <span className="ml-auto text-xs">{counts[item.id]}</span>
                    </button>
                  );
                })}
              </motion.nav>
            )}
          </AnimatePresence>

          <div className="px-0 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <div className="mx-4 flex flex-col gap-5 border-b border-border pb-6 sm:mx-0 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">{tr(locale, "Wednesday / 23 September", "Rabu / 23 September")}</p>
                <h1 className="mt-2 text-4xl font-black leading-none tracking-[-0.06em] sm:text-5xl">{currentViewLabel}</h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {view === "today"
                    ? tr(locale, "Your highest-impact work, sorted by urgency, effort, and what it unlocks.", "Pekerjaan berdampak tertinggi, disusun berdasarkan urgensi, usaha, dan manfaatnya.")
                    : tr(locale, "Review your plan and keep every commitment in the right order.", "Tinjau rencana Anda dan susun setiap komitmen dalam urutan yang tepat.")}
                </p>
              </div>
            </div>

            {aiError && (
              <div role="alert" className="theme-surface mx-4 mt-5 flex items-start justify-between gap-4 border-l-4 border-destructive px-4 py-3 text-sm shadow-[4px_4px_0_rgba(23,23,23,0.1)] sm:mx-0">
                <span><strong className="block">{tr(locale, "AI gateway needs attention", "Gateway AI memerlukan perhatian")}</strong><span className="mt-1 block text-xs leading-relaxed text-[#66645e]">{localizeError(locale, aiError, "Analisis AI belum berhasil. Silakan coba lagi sebentar lagi.")}</span></span>
                <button type="button" onClick={() => setAiError("")} className="grid size-8 shrink-0 place-items-center" aria-label={tr(locale, "Dismiss AI error", "Tutup error AI")}><X className="size-4" /></button>
              </div>
            )}

            {workspaceError && (
              <div role="alert" className="theme-surface mx-4 mt-5 flex items-start justify-between gap-4 border-l-4 border-destructive px-4 py-3 text-sm shadow-[4px_4px_0_rgba(23,23,23,0.1)] sm:mx-0">
                <span><strong className="block">{tr(locale, "Workspace sync needs attention", "Sinkronisasi ruang kerja memerlukan perhatian")}</strong><span className="mt-1 block text-xs leading-relaxed text-[#66645e]">{localizeError(locale, workspaceError, "Data ruang kerja belum dapat disinkronkan. Silakan coba lagi.")}</span></span>
                <button type="button" onClick={() => setWorkspaceError("")} className="grid size-8 shrink-0 place-items-center" aria-label={tr(locale, "Dismiss sync error", "Tutup error sinkronisasi")}><X className="size-4" /></button>
              </div>
            )}

            <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-px border border-[#171717] bg-[#171717] shadow-[10px_10px_0_rgba(23,23,23,0.16)]">
              <section aria-labelledby="task-list-title" className="relative flex min-h-[650px] min-w-0 flex-col overflow-hidden bg-[#171717] p-2 text-[#fffef9] sm:p-4 lg:p-5">
                {!reducedMotion && isProcessing && (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[22%] bg-gradient-to-b from-transparent via-[#f2ff55]/30 to-transparent"
                    initial={{ y: "-125%", opacity: 0 }}
                    animate={{ y: "520%", opacity: [0, 0.35, 0.68, 0.35, 0] }}
                    transition={{ duration: 1.15, repeat: Infinity, ease: [0.45, 0, 0.55, 1], times: [0, 0.18, 0.5, 0.82, 1] }}
                  />
                )}

                <div className="flex flex-col gap-3 border-b border-white/15 pb-3 sm:gap-4 sm:pb-4">
                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div>
                      <h2 id="task-list-title" className="text-base font-black tracking-[-0.045em] sm:text-xl lg:text-2xl">
                        <span className="sm:hidden">{tr(locale, "Tasks", "Tugas")}</span>
                        <span className="hidden sm:inline">{tr(locale, "Your next moves", "Langkah berikutnya")}</span>
                      </h2>
                      <p className="mt-1 hidden text-xs text-[#9b9991] lg:block">{tr(locale, "Choose a task to open its focus brief.", "Pilih tugas untuk membuka ringkasan fokusnya.")}</p>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={rerank}
                        disabled={isReranking}
                        aria-label={isReranking ? tr(locale, "Re-ranking tasks", "Menyusun ulang tugas") : tr(locale, "Re-rank tasks", "Susun ulang tugas")}
                        className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 border border-white/20 bg-white/[0.05] px-2 text-xs font-black text-[#fffef9] hover:bg-white/10 disabled:cursor-wait disabled:opacity-60 sm:min-h-10 sm:px-3"
                      >
                        <RotateCcw className={isReranking ? "size-4 animate-spin" : "size-4"} strokeWidth={2.2} aria-hidden="true" />
                        <span className="hidden sm:inline">{isReranking ? tr(locale, "Re-ranking", "Menyusun") : tr(locale, "Re-rank", "Susun ulang")}</span>
                      </button>
                      <button type="button" onClick={() => setIsAdding(true)} aria-label={tr(locale, "Add task", "Tambah tugas")} className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 bg-[#f2ff55] px-2 text-xs font-black text-[#171717] transition-transform hover:-translate-y-0.5 active:translate-y-px sm:min-h-10 sm:px-3">
                        <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" /> <span className="hidden sm:inline">{tr(locale, "Add task", "Tambah tugas")}</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[#aaa79f] sm:left-3 sm:size-4" strokeWidth={2} aria-hidden="true" />
                    <label className="sr-only" htmlFor="task-list-search">{tr(locale, "Search tasks", "Cari tugas")}</label>
                    <input
                      id="task-list-search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="min-h-10 w-full border border-white/20 bg-white/[0.06] pl-7 pr-2 text-xs font-medium text-[#fffef9] outline-none placeholder:text-[#8e8b83] focus:border-[#f2ff55] focus:ring-2 focus:ring-[#f2ff55]/30 sm:min-h-11 sm:pl-10 sm:pr-4 sm:text-sm"
                      placeholder={tr(locale, "Search tasks", "Cari tugas")}
                    />
                  </div>

                  <div className="flex min-h-10 items-center justify-between gap-2 bg-white/[0.04] px-1 sm:min-h-11 sm:gap-3 sm:px-2">
                    <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {(["all", "open", "in_progress", "done"] as Filter[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFilter(option)}
                          className={filter === option ? "whitespace-nowrap bg-[#f2ff55] px-2 py-2 text-[10px] font-black text-[#171717] sm:px-3 sm:text-xs" : "whitespace-nowrap px-2 py-2 text-[10px] font-bold text-[#aaa79f] hover:bg-white/10 hover:text-white sm:px-3 sm:text-xs"}
                        >
                          {option === "all" ? tr(locale, "All", "Semua") : statusLabels[option]}
                        </button>
                      ))}
                    </div>
                    <span className="hidden shrink-0 pr-1 text-xs font-bold text-[#aaa79f] md:inline">{visibleTasks.length} {tr(locale, "tasks", "tugas")}</span>
                  </div>
                </div>

                <div className="mt-3 flex-1 sm:mt-4" aria-live="polite" aria-busy={isProcessing}>
                  {visibleTasks.length === 0 && <EmptyState locale={locale} onAdd={() => setIsAdding(true)} />}

                  {visibleTasks.length > 0 && (
                    <Reorder.Group
                      as="div"
                      axis="y"
                      values={visibleTasks.map((task) => task.id)}
                      onReorder={reorderVisibleTasks}
                      className="grid content-start gap-2 sm:gap-2.5"
                    >
                      {visibleTasks.map((task, index) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          index={index}
                          locale={locale}
                          active={task.id === selectedTask?.id}
                          disabled={isProcessing}
                          reducedMotion={reducedMotion}
                          onComplete={() => updateTask(task.id, { status: task.status === "done" ? "open" : "done" })}
                          onSelect={() => selectTask(task.id)}
                          onMove={(direction) => moveVisibleTask(task.id, direction)}
                          onToggleStar={() => updateTask(task.id, { starred: !task.starred })}
                        />
                      ))}
                    </Reorder.Group>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/15 pt-4 text-[10px] font-bold text-[#aaa79f]" role="status" aria-live="polite">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span className="relative flex size-2.5 shrink-0 items-center justify-center" aria-hidden="true">
                      {isProcessing && !reducedMotion && (
                        <motion.span
                          className="absolute size-2.5 rounded-full bg-[#f2ff55]/40"
                          animate={{ scale: [1, 2.2], opacity: [0.75, 0] }}
                          transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                      <span className={isProcessing ? "relative size-2 rounded-full bg-[#f2ff55]" : saveStatus === "error" ? "relative size-2 rounded-full bg-destructive" : "relative size-2 rounded-full bg-[#42b576]"} />
                    </span>
                    <span className="truncate">
                      {isProcessing
                        ? tr(locale, "AI is analyzing your plan...", "AI sedang menganalisis rencana Anda...")
                        : saveStatus === "saving"
                          ? tr(locale, "Saving to database...", "Menyimpan ke database...")
                          : saveStatus === "error"
                            ? tr(locale, "Database save failed", "Penyimpanan database gagal")
                            : saveStatus === "saved"
                              ? tr(locale, "Saved to database", "Tersimpan di database")
                              : orderSource === "manual"
                                ? tr(locale, "Manual order ready", "Urutan manual siap")
                                : tr(locale, "Priorities are up to date", "Prioritas sudah diperbarui")}
                    </span>
                  </span>
                </div>
              </section>

              {selectedTask ? (
                <motion.aside
                  key={selectedTask.id}
                  initial={reducedMotion ? false : { opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="theme-surface relative min-w-0 self-stretch overflow-hidden"
                  aria-label={tr(locale, "Selected task details", "Detail tugas terpilih")}
                >
                  {!reducedMotion && isProcessing && (
                    <motion.div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[24%] bg-gradient-to-b from-transparent via-[#f2ff55]/55 to-transparent"
                      initial={{ y: "-125%", opacity: 0 }}
                      animate={{ y: "430%", opacity: [0, 0.35, 0.72, 0.35, 0] }}
                      transition={{ duration: 1.15, repeat: Infinity, ease: [0.45, 0, 0.55, 1], times: [0, 0.18, 0.5, 0.82, 1] }}
                    />
                  )}
                  <div className="flex items-center justify-between gap-1 border-b border-black/15 px-2 py-3 sm:gap-3 sm:px-6 sm:py-4">
                    <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#66645e] sm:text-xs sm:tracking-[0.1em]"><Sparkles className="size-4 shrink-0 text-[#171717]" strokeWidth={2} aria-hidden="true" /> <span className="hidden sm:inline">{tr(locale, "AI focus brief", "Ringkasan fokus AI")}</span></span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={analyzeBrief} disabled={isProcessing} className="inline-flex size-9 items-center justify-center gap-2 border border-black/15 text-xs font-black hover:bg-black/5 disabled:cursor-wait disabled:opacity-60 sm:min-h-10 sm:w-auto sm:px-3" aria-label={tr(locale, "Analyze task with AI", "Analisis tugas dengan AI")}>
                        <ScanLine className={isAnalyzing ? "size-4 animate-pulse" : "size-4"} strokeWidth={2} aria-hidden="true" />
                        <span className="hidden sm:inline">{isAnalyzing ? tr(locale, "Analyzing", "Menganalisis") : tr(locale, "Analyze", "Analisis")}</span>
                      </button>
                      <button type="button" onClick={() => setEditingTask(selectedTask)} className="grid size-9 place-items-center border border-black/15 text-[#171717] hover:bg-black/5 sm:size-10" aria-label={tr(locale, "Edit task", "Edit tugas")}>
                        <Pencil className="size-4" strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => deleteTask(selectedTask.id)} className="grid size-9 place-items-center border border-black/15 text-destructive hover:bg-destructive/10 sm:size-10" aria-label={tr(locale, "Delete task", "Hapus tugas")}>
                        <Trash2 className="size-4" strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 sm:p-6">
                    <div>
                      <p className="text-[10px] font-bold text-[#66645e] sm:text-xs">{localizeContent(locale, selectedTask.category)} / {localizeContent(locale, selectedTask.dueLabel)} {tr(locale, "at", "pukul")} {localizeTime(locale, selectedTask.dueTime)}</p>
                      <h2 className="mt-2 text-xl font-black leading-[1.02] tracking-[-0.045em] sm:text-4xl sm:leading-[0.98] sm:tracking-[-0.055em]">{localizeContent(locale, selectedTask.title)}</h2>
                      <p className="mt-3 max-w-[52ch] text-xs leading-relaxed text-[#66645e] sm:mt-4 sm:text-sm">{localizeContent(locale, selectedTask.description)}</p>
                    </div>

                    <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3 sm:mt-6 sm:gap-x-4">
                      <motion.strong
                        key={`${decisionScore.score}-${decisionScore.prosTotal}-${decisionScore.consTotal}`}
                        initial={reducedMotion ? false : { opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-black leading-none tracking-[-0.08em] sm:text-5xl"
                      >
                        {decisionScore.score}
                      </motion.strong>
                      <span className="text-[10px] font-bold leading-relaxed text-[#66645e]">
                        {tr(locale, "decision score out of 100", "skor keputusan dari 100")}<br />
                        {decisionScore.prosCount} {tr(locale, "pros", "pro")} · {tr(locale, "total impact", "total dampak")} {decisionScore.prosTotal}<br />
                        {decisionScore.consCount} {tr(locale, "cons", "kontra")} · {tr(locale, "total impact", "total dampak")} {decisionScore.consTotal}
                      </span>
                      <div className="col-span-2 h-1 overflow-hidden bg-[#e0ddd4]" role="progressbar" aria-label={`${tr(locale, "Decision score", "Skor keputusan")}: ${decisionScore.prosTotal} / (${decisionScore.prosTotal} + ${decisionScore.consTotal})`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={decisionScore.score}>
                        <motion.div
                          key={`score-${selectedTask.id}-${decisionScore.score}-${decisionScore.prosTotal}-${decisionScore.consTotal}`}
                          className="h-full origin-left bg-[#f2ff55]"
                          initial={reducedMotion ? { scaleX: decisionScore.score / 100 } : { scaleX: 0.24 }}
                          animate={{ scaleX: decisionScore.score / 100 }}
                          transition={{ duration: reducedMotion ? 0 : 0.72, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-1.5 sm:mt-7 sm:gap-2" aria-label={tr(locale, "Priority signals", "Sinyal prioritas")}>
                      {selectedTask.signals.map((signal) => <span key={signal} className="border border-black/15 bg-[#f1efe7] px-2 py-1.5 text-[10px] font-bold text-[#54514b] sm:px-3 sm:py-2 sm:text-xs">{localizeContent(locale, signal)}</span>)}
                    </div>

                    <div className="mt-5 border border-black/15 bg-[#f1efe7] p-2 sm:mt-7 sm:p-2.5">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto]" role="group" aria-label={tr(locale, "Decision tools", "Alat keputusan")}>
                        <label className="relative col-span-2 block sm:col-span-1" htmlFor="decision-search">
                          <span className="sr-only">{tr(locale, "Search decisions", "Cari keputusan")}</span>
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#77746c]" strokeWidth={2} aria-hidden="true" />
                          <input
                            id="decision-search"
                            type="search"
                            value={decisionQuery}
                            onChange={(event) => setDecisionQuery(event.target.value)}
                            placeholder={tr(locale, "Search pros and cons", "Cari pro dan kontra")}
                            className="min-h-10 w-full border border-black/20 bg-[#fffef9] pl-9 pr-9 text-sm font-medium text-[#171717] outline-none placeholder:text-[#77746c] focus:border-black focus:ring-2 focus:ring-[#d6e72f]"
                          />
                          {decisionQuery && (
                            <button type="button" onClick={() => setDecisionQuery("")} className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-[#66645e] hover:bg-black/5 hover:text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6e72f]" aria-label={tr(locale, "Clear decision search", "Hapus pencarian keputusan")}>
                              <X className="size-4" strokeWidth={2} aria-hidden="true" />
                            </button>
                          )}
                        </label>

                        <label className="inline-flex min-h-10 min-w-0 items-center gap-1.5 border border-black/20 bg-[#fffef9] py-1 pl-2.5 pr-1.5 sm:gap-2 sm:pl-3">
                          <ListFilter className="size-4 shrink-0 text-[#54514b]" strokeWidth={2} aria-hidden="true" />
                          <span className="sr-only">{tr(locale, "Sort by impact", "Urutkan berdasarkan dampak")}</span>
                          <select
                            key={`${selectedTask.id}-impact-filter`}
                            defaultValue=""
                            disabled={isProcessing || (selectedTask.upsideItems.length < 2 && selectedTask.riskItems.length < 2)}
                            onChange={(event) => sortSelectedDecisionsByImpact(event.target.value as "asc" | "desc")}
                            className="min-h-8 min-w-0 max-w-40 bg-transparent px-1 text-xs font-bold text-[#171717] outline-none focus:ring-2 focus:ring-[#d6e72f] disabled:opacity-40 sm:max-w-none"
                            aria-label={tr(locale, "Sort decisions by impact", "Urutkan keputusan berdasarkan dampak")}
                          >
                            <option value="" disabled>{tr(locale, "Impact filter", "Filter dampak")}</option>
                            <option value="asc">{tr(locale, "Low to high (1-5)", "Rendah ke tinggi (1-5)")}</option>
                            <option value="desc">{tr(locale, "High to low (5-1)", "Tinggi ke rendah (5-1)")}</option>
                          </select>
                        </label>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setIsAddingDecision((current) => !current)}
                          className={isAddingDecision
                            ? "inline-flex min-h-10 items-center justify-center gap-1.5 border border-black/20 bg-[#fffef9] px-3 text-xs font-black text-[#171717] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6e72f] disabled:cursor-wait disabled:opacity-40"
                            : "inline-flex min-h-10 items-center justify-center gap-1.5 bg-[#171717] px-3 text-xs font-black text-[#fffef9] hover:bg-[#2a2a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6e72f] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-40"}
                          aria-expanded={isAddingDecision}
                          aria-controls="add-decision-form"
                        >
                          {isAddingDecision ? <X className="size-4" strokeWidth={2.2} aria-hidden="true" /> : <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />}
                          <span className="whitespace-nowrap">{isAddingDecision ? tr(locale, "Cancel", "Batal") : tr(locale, "Add decision", "Tambah keputusan")}</span>
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {isAddingDecision && (
                          <motion.form
                            id="add-decision-form"
                            onSubmit={addDecision}
                            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 grid gap-2 border-t border-black/15 pt-2 sm:grid-cols-2 xl:grid-cols-[130px_160px_minmax(0,1fr)_auto] xl:items-end">
                              <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.06em] text-[#54514b]">
                                {tr(locale, "Type", "Jenis")}
                                <select value={newDecisionKind} onChange={(event) => setNewDecisionKind(event.target.value as InsightKind)} className="min-h-10 border border-black/20 bg-[#fffef9] px-2.5 text-sm font-bold normal-case tracking-normal text-[#171717] outline-none focus:border-black focus:ring-2 focus:ring-[#d6e72f]">
                                  <option value="upside">{tr(locale, "Pro", "Pro")}</option>
                                  <option value="risk">{tr(locale, "Con", "Kontra")}</option>
                                </select>
                              </label>

                              <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.06em] text-[#54514b]">
                                {tr(locale, "Impact", "Dampak")}
                                <select value={newDecisionImpact} onChange={(event) => setNewDecisionImpact(Number(event.target.value) as ImpactScore)} style={{ borderColor: impactTones[newDecisionImpact].borderColor }} className={`min-h-10 border px-2.5 text-sm font-bold normal-case tracking-normal outline-none focus:ring-2 focus:ring-[#d6e72f] ${impactTones[newDecisionImpact].className}`}>
                                  {impactScores.map((score) => <option key={score} value={score}>{score} · {impactLabels[score]}</option>)}
                                </select>
                              </label>

                              <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.06em] text-[#54514b] sm:col-span-2 xl:col-span-1">
                                {tr(locale, "Decision", "Keputusan")}
                                <input value={newDecisionText} onChange={(event) => setNewDecisionText(event.target.value)} className="min-h-10 border border-black/20 bg-[#fffef9] px-3 text-sm font-medium normal-case tracking-normal text-[#171717] outline-none placeholder:text-[#77746c] focus:border-black focus:ring-2 focus:ring-[#d6e72f]" placeholder={tr(locale, "Write a clear statement", "Tulis pernyataan yang jelas")} autoFocus />
                              </label>

                              <button type="submit" disabled={!newDecisionText.trim()} className="inline-flex min-h-10 items-center justify-center gap-1.5 bg-[#171717] px-4 text-xs font-black text-[#fffef9] hover:bg-[#2a2a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6e72f] focus-visible:ring-offset-2 disabled:opacity-40 sm:col-span-2 sm:justify-self-end xl:col-span-1">
                                <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" /> {tr(locale, "Add", "Tambah")}
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mt-2.5 grid gap-3 xl:grid-cols-2">
                      <InsightList
                        key={`${selectedTask.id}-upside`}
                        kind="upside"
                        title={tr(locale, "Pros", "Pro")}
                        items={selectedTask.upsideItems}
                        query={decisionQuery}
                        locale={locale}
                        disabled={isProcessing}
                        reducedMotion={reducedMotion}
                        onChange={(upsideItems) => updateTask(selectedTask.id, { upsideItems })}
                      />
                      <InsightList
                        key={`${selectedTask.id}-risk`}
                        kind="risk"
                        title={tr(locale, "Cons", "Kontra")}
                        items={selectedTask.riskItems}
                        query={decisionQuery}
                        locale={locale}
                        disabled={isProcessing}
                        reducedMotion={reducedMotion}
                        onChange={(riskItems) => updateTask(selectedTask.id, { riskItems })}
                      />
                    </div>

                    <div className="mt-7 border-t border-black/15 pt-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-full bg-[#171717] text-[#f2ff55]"><AlarmClock className="size-5" strokeWidth={1.9} aria-hidden="true" /></span>
                          <span>
                            <strong className="block text-sm">{tr(locale, "Reminder", "Pengingat")}</strong>
                            <span className="text-xs text-[#66645e]">{localizeTime(locale, localizeContent(locale, selectedTask.reminder))}</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2" role="group" aria-label={tr(locale, "Reminder channels", "Kanal pengingat")}>
                          {(["In app", "Email", "Push"] as ReminderChannel[]).map((channel) => (
                            <button key={channel} type="button" aria-pressed={selectedTask.channels.includes(channel)} onClick={() => toggleChannel(channel)} className={selectedTask.channels.includes(channel) ? "min-h-9 border border-[#171717] bg-[#171717] px-3 text-xs font-black text-[#fffef9]" : "min-h-9 border border-black/20 px-3 text-xs font-bold text-[#66645e] hover:border-black"}>{channel === "In app" ? tr(locale, "In app", "Di aplikasi") : channel === "Email" ? tr(locale, "Email", "Surel") : tr(locale, "Push", "Notifikasi push")}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button type="button" onClick={() => updateTask(selectedTask.id, { status: selectedTask.status === "done" ? "open" : "done" })} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-[#171717] px-4 font-black text-[#fffef9] transition-transform hover:-translate-y-0.5 active:translate-y-px">
                        <CheckCircle2 className="size-5" strokeWidth={2} aria-hidden="true" /> {selectedTask.status === "done" ? tr(locale, "Reopen task", "Buka kembali") : tr(locale, "Mark complete", "Tandai selesai")}
                      </button>
                      <button type="button" onClick={() => updateTask(selectedTask.id, { status: selectedTask.status === "in_progress" ? "open" : "in_progress" })} className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#171717] px-5 font-black hover:bg-black/5 active:translate-y-px">
                        {selectedTask.status === "in_progress" ? tr(locale, "Pause", "Jeda") : tr(locale, "Start task", "Mulai tugas")}
                      </button>
                    </div>
                  </div>
                </motion.aside>
              ) : (
                <div className="theme-surface grid min-h-80 place-items-center border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{tr(locale, "Select a task to see its focus brief.", "Pilih tugas untuk melihat ringkasan fokusnya.")}</div>
              )}
            </div>
          </div>
        </section>
      </div>

      <TaskDialog
        key={editingTask?.id ?? (isAdding ? "new-task" : "closed-task-dialog")}
        locale={locale}
        open={isAdding || editingTask !== null}
        task={editingTask}
        onClose={() => {
          setIsAdding(false);
          setEditingTask(null);
        }}
        onSave={editingTask ? saveTaskEdits : addTask}
      />
    </main>
  );
}

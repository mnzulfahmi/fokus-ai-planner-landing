import { getInsForgeAdmin } from "@/lib/insforge-admin";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const COOKIE_NAME = "fokus_workspace_id";
const MAX_TASKS = 100;
const MAX_INSIGHTS_PER_LIST = 24;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Locale = "en" | "id";
type OrderSource = "ai" | "manual";

type InsightPayload = {
  id: string;
  text: string;
  source: "ai" | "human";
  starred: boolean;
  impact: number;
};

type TaskPayload = {
  id: string;
  title: string;
  description: string;
  category: string;
  dueLabel: string;
  dueGroup: "today" | "tomorrow" | "later";
  dueTime: string;
  priority: number;
  status: "open" | "in_progress" | "done";
  starred: boolean;
  upsideItems: InsightPayload[];
  riskItems: InsightPayload[];
  signals: string[];
  reminder: string;
  channels: string[];
};

type WorkspacePayload = {
  tasks: TaskPayload[];
  manualOrder: string[] | null;
  orderSource: OrderSource;
  selectedId: string;
  locale: Locale;
};

type WorkspaceRow = {
  id: string;
  locale: Locale;
  manual_order: string[] | null;
  order_source: OrderSource;
  selected_task_id: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  due_label: string;
  due_group: TaskPayload["dueGroup"];
  due_time: string;
  priority: number;
  status: TaskPayload["status"];
  starred: boolean;
  signals: string[];
  reminder: string;
  channels: string[];
  position: number;
};

type InsightRow = {
  task_id: string;
  id: string;
  kind: "upside" | "risk";
  text: string;
  source: InsightPayload["source"];
  starred: boolean;
  impact: number;
  position: number;
};

function isShortString(value: unknown, max = 500) {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function isInsight(value: unknown): value is InsightPayload {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return isShortString(item.id, 160)
    && typeof item.text === "string"
    && item.text.length <= 2000
    && (item.source === "ai" || item.source === "human")
    && typeof item.starred === "boolean"
    && typeof item.impact === "number"
    && Number.isInteger(item.impact)
    && item.impact >= 1
    && item.impact <= 5;
}

function isTask(value: unknown): value is TaskPayload {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return isShortString(task.id, 160)
    && isShortString(task.title, 240)
    && isShortString(task.description, 2000)
    && isShortString(task.category, 120)
    && isShortString(task.dueLabel, 120)
    && (task.dueGroup === "today" || task.dueGroup === "tomorrow" || task.dueGroup === "later")
    && isShortString(task.dueTime, 120)
    && typeof task.priority === "number"
    && Number.isInteger(task.priority)
    && task.priority >= 0
    && task.priority <= 100
    && (task.status === "open" || task.status === "in_progress" || task.status === "done")
    && typeof task.starred === "boolean"
    && Array.isArray(task.upsideItems)
    && task.upsideItems.length <= MAX_INSIGHTS_PER_LIST
    && task.upsideItems.every(isInsight)
    && Array.isArray(task.riskItems)
    && task.riskItems.length <= MAX_INSIGHTS_PER_LIST
    && task.riskItems.every(isInsight)
    && Array.isArray(task.signals)
    && task.signals.length <= 24
    && task.signals.every((item) => isShortString(item, 240))
    && isShortString(task.reminder, 240)
    && Array.isArray(task.channels)
    && task.channels.length <= 12
    && task.channels.every((item) => isShortString(item, 80));
}

function isWorkspace(value: unknown): value is WorkspacePayload {
  if (!value || typeof value !== "object") return false;
  const workspace = value as Record<string, unknown>;
  return Array.isArray(workspace.tasks)
    && workspace.tasks.length <= MAX_TASKS
    && workspace.tasks.every(isTask)
    && (workspace.manualOrder === null || (Array.isArray(workspace.manualOrder) && workspace.manualOrder.every((id) => isShortString(id, 160))))
    && (workspace.orderSource === "ai" || workspace.orderSource === "manual")
    && typeof workspace.selectedId === "string"
    && workspace.selectedId.length <= 160
    && (workspace.locale === "en" || workspace.locale === "id");
}

async function getWorkspaceId(request: Request) {
  const cookieStore = await cookies();
  const existingId = cookieStore.get(COOKIE_NAME)?.value;
  const requestedId = request.headers.get("x-fokus-workspace-id")?.trim();
  const workspaceId = requestedId && UUID_PATTERN.test(requestedId)
    ? requestedId
    : existingId && UUID_PATTERN.test(existingId)
      ? existingId
      : crypto.randomUUID();

  if (workspaceId !== existingId) {
    cookieStore.set(COOKIE_NAME, workspaceId, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return workspaceId;
}

export async function GET(request: Request) {
  try {
    const workspaceId = await getWorkspaceId(request);
    const admin = getInsForgeAdmin();
    const [workspaceResult, tasksResult, insightsResult] = await Promise.all([
      admin.database
        .from("fokus_workspaces")
        .select("id, locale, manual_order, order_source, selected_task_id")
        .eq("id", workspaceId)
        .maybeSingle(),
      admin.database
        .from("fokus_tasks")
        .select("id, title, description, category, due_label, due_group, due_time, priority, status, starred, signals, reminder, channels, position")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true })
        .limit(MAX_TASKS),
      admin.database
        .from("fokus_insights")
        .select("task_id, id, kind, text, source, starred, impact, position")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true })
        .limit(MAX_TASKS * MAX_INSIGHTS_PER_LIST * 2),
    ]);

    const databaseError = workspaceResult.error || tasksResult.error || insightsResult.error;
    if (databaseError) throw databaseError;

    const workspaceRow = workspaceResult.data as WorkspaceRow | null;
    if (!workspaceRow) return Response.json({ workspace: null, workspaceId });

    const insights = (insightsResult.data ?? []) as InsightRow[];
    const tasks = ((tasksResult.data ?? []) as TaskRow[]).map((task) => {
      const toInsight = (item: InsightRow): InsightPayload => ({
        id: item.id,
        text: item.text,
        source: item.source,
        starred: item.starred,
        impact: item.impact,
      });

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        dueLabel: task.due_label,
        dueGroup: task.due_group,
        dueTime: task.due_time,
        priority: task.priority,
        status: task.status,
        starred: task.starred,
        upsideItems: insights.filter((item) => item.task_id === task.id && item.kind === "upside").map(toInsight),
        riskItems: insights.filter((item) => item.task_id === task.id && item.kind === "risk").map(toInsight),
        signals: task.signals,
        reminder: task.reminder,
        channels: task.channels,
      };
    });

    return Response.json({
      workspaceId,
      workspace: {
        tasks,
        manualOrder: workspaceRow.manual_order,
        orderSource: workspaceRow.order_source,
        selectedId: workspaceRow.selected_task_id || tasks[0]?.id || "",
        locale: workspaceRow.locale,
      } satisfies WorkspacePayload,
    });
  } catch (error) {
    console.error("Failed to load Fokus workspace", error instanceof Error ? error.message : error);
    return Response.json({ error: "The workspace could not be loaded." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The workspace must be valid JSON." }, { status: 400 });
  }

  if (!isWorkspace(body)) {
    return Response.json({ error: "The workspace data is incomplete or too large." }, { status: 400 });
  }

  try {
    const workspaceId = await getWorkspaceId(request);
    const admin = getInsForgeAdmin();
    const { error } = await admin.database.rpc("save_fokus_workspace", {
      p_workspace_id: workspaceId,
      p_locale: body.locale,
      p_manual_order: body.manualOrder,
      p_order_source: body.orderSource,
      p_selected_task_id: body.selectedId || null,
      p_tasks: body.tasks,
    });

    if (error) throw error;
    return Response.json({ workspaceId, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Failed to save Fokus workspace", error instanceof Error ? error.message : error);
    return Response.json({ error: "The workspace could not be saved." }, { status: 503 });
  }
}

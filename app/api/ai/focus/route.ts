import { geminiModel, getGoogleAiClient } from "@/lib/google-ai";

export const runtime = "nodejs";

type TaskInput = {
  id: string;
  title: string;
  description: string;
  category: string;
  dueLabel: string;
  dueTime: string;
  priority: number;
  status: string;
  starred: boolean;
};

type InsightInput = {
  id: string;
  text: string;
  source: "ai" | "human";
  starred: boolean;
  impact: number;
};

type InsightResult = {
  id: string;
  text: string;
  impact: number;
};

type AnalysisResult = {
  upside: InsightResult[];
  risks: InsightResult[];
};

type CompleteOptions<T> = {
  normalize?: (value: Record<string, unknown>) => T;
  responseJsonSchema: Record<string, unknown>;
};

type FocusRequest =
  | { action: "rerank"; locale: "en" | "id"; tasks: TaskInput[] }
  | {
      action: "analyze";
      locale: "en" | "id";
      task: TaskInput;
      upsideItems: InsightInput[];
      riskItems: InsightInput[];
    };

const MAX_TASKS = 40;
const MAX_ITEMS = 12;

function parseObject(content: string) {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("MODEL_RESPONSE_INVALID");
  return JSON.parse(normalized.slice(start, end + 1)) as Record<string, unknown>;
}

function normalizeInsightList(value: unknown, expected: InsightInput[]) {
  if (!Array.isArray(value) || value.length !== expected.length) {
    throw new Error("MODEL_RESPONSE_INCOMPLETE");
  }

  const expectedIds = new Set(expected.map((item) => item.id));
  const resultById = new Map<string, Record<string, unknown>>();

  value.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.id === "string" && expectedIds.has(candidate.id) && !resultById.has(candidate.id)) {
      resultById.set(candidate.id, candidate);
    }
  });

  return expected.map((item, index) => {
    const positional = value[index] && typeof value[index] === "object"
      ? value[index] as Record<string, unknown>
      : {};
    const candidate = resultById.get(item.id) ?? positional;
    const generatedText = typeof candidate.text === "string" ? candidate.text.trim() : "";
    const mustGenerateText = item.source === "ai" && !item.starred;
    const text = item.starred || item.source === "human" ? item.text : generatedText;

    if (mustGenerateText && !text) throw new Error("MODEL_RESPONSE_INCOMPLETE");

    const candidateImpact = Number(candidate.impact);
    const impact = item.starred || !Number.isFinite(candidateImpact)
      ? item.impact
      : Math.round(Math.max(1, Math.min(5, candidateImpact)));

    return { id: item.id, text, impact };
  });
}

function normalizeAnalysisResult(
  value: Record<string, unknown>,
  upsideItems: InsightInput[],
  riskItems: InsightInput[],
): AnalysisResult {
  const upside = value.upside ?? value.pros ?? value.advantages;
  const risks = value.risks ?? value.cons ?? value.disadvantages;
  return {
    upside: normalizeInsightList(upside, upsideItems),
    risks: normalizeInsightList(risks, riskItems),
  };
}

function insightResponseSchema(items: InsightInput[]) {
  return {
    type: "array",
    minItems: items.length,
    maxItems: items.length,
    items: {
      type: "object",
      properties: {
        id: { type: "string", enum: items.map((item) => item.id) },
        text: { type: "string" },
        impact: { type: "integer", minimum: 1, maximum: 5 },
      },
      required: ["id", "text", "impact"],
      additionalProperties: false,
    },
  };
}

function isTask(value: unknown): value is TaskInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.title === "string" && typeof item.description === "string" && typeof item.priority === "number";
}

function isInsight(value: unknown): value is InsightInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.text === "string" && (item.source === "ai" || item.source === "human") && typeof item.starred === "boolean" && typeof item.impact === "number" && item.impact >= 1 && item.impact <= 5;
}

function validRequest(value: unknown): value is FocusRequest {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  const hasValidLocale = body.locale === "en" || body.locale === "id";
  if (body.action === "rerank") return hasValidLocale && Array.isArray(body.tasks) && body.tasks.length > 0 && body.tasks.length <= MAX_TASKS && body.tasks.every(isTask);
  if (body.action === "analyze") return hasValidLocale && isTask(body.task) && Array.isArray(body.upsideItems) && body.upsideItems.length <= MAX_ITEMS && body.upsideItems.every(isInsight) && Array.isArray(body.riskItems) && body.riskItems.length <= MAX_ITEMS && body.riskItems.every(isInsight);
  return false;
}

async function complete<T extends Record<string, unknown> = Record<string, unknown>>(
  system: string,
  input: unknown,
  options: CompleteOptions<T>,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await getGoogleAiClient().interactions.create({
        model: geminiModel,
        input: JSON.stringify(input),
        system_instruction: system,
        generation_config: {
          thinking_level: "minimal",
          max_output_tokens: 4096,
        },
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: options.responseJsonSchema,
        },
        store: false,
      });

      const content = response.output_text;
      if (!content) throw new Error("MODEL_RESPONSE_EMPTY");
      const parsed = parseObject(content);
      return {
        result: options.normalize ? options.normalize(parsed) : parsed as T,
        model: response.model || geminiModel,
      };
    } catch (error) {
      lastError = error;
      const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
      const message = error instanceof Error ? error.message : "";
      const retryable = message.startsWith("MODEL_RESPONSE_") || [408, 429, 500, 502, 503, 504, 520, 522, 524].includes(status);
      if (!retryable || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw lastError;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  if (!validRequest(body)) {
    return Response.json({ error: "The AI request is incomplete or too large." }, { status: 400 });
  }

  try {
    if (body.action === "rerank") {
      const outputLanguage = body.locale === "id" ? "Write every reason in Indonesian." : "Write every reason in English.";
      const response = await complete(
        `You are the priority engine for Fokus, a personal task planner. Return only valid JSON with this shape: {"tasks":[{"id":"existing-id","priority":0,"reason":"short reason"}]}. Include every task exactly once and never invent IDs. Score from 0 to 100 using urgency, impact, dependencies, and effort. Completed tasks must keep their current score. A starred task may receive a new score, but the client will keep its list position fixed. Reasons must be concise and concrete. ${outputLanguage}`,
        body.tasks,
        {
          responseJsonSchema: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                minItems: body.tasks.length,
                maxItems: body.tasks.length,
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", enum: body.tasks.map((task) => task.id) },
                    priority: { type: "integer", minimum: 0, maximum: 100 },
                    reason: { type: "string" },
                  },
                  required: ["id", "priority", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["tasks"],
            additionalProperties: false,
          },
        },
      );
      return Response.json(response);
    }

    const outputLanguage = body.locale === "id" ? "Write every generated or rewritten statement in Indonesian." : "Write every generated or rewritten statement in English.";
    const response = await complete<AnalysisResult>(
      `You analyze the decision to complete a task and write task-specific pros and cons for Fokus. Return only valid JSON with this shape: {"upside":[{"id":"existing-id","text":"pro statement","impact":3}],"risks":[{"id":"existing-id","text":"con statement","impact":3}]}. Treat upside items as pros of completing the task and risk items as cons, costs, or tradeoffs of completing it. Include every supplied insight exactly once and never invent IDs. An AI insight with empty text is a generation slot: fill it with a concrete, task-specific statement. Otherwise, rewrite only AI items that are not starred. Each statement must describe a plausible outcome or tradeoff, not generic advice. Score each statement on this exact scale: 1 = very low impact, 2 = low impact, 3 = moderate impact, 4 = high impact, 5 = very high impact. Preserve human-authored text exactly. Preserve both the text and impact of starred items exactly. ${outputLanguage}`,
      { task: body.task, upsideItems: body.upsideItems, riskItems: body.riskItems },
      {
        normalize: (value) => normalizeAnalysisResult(value, body.upsideItems, body.riskItems),
        responseJsonSchema: {
          type: "object",
          properties: {
            upside: insightResponseSchema(body.upsideItems),
            risks: insightResponseSchema(body.riskItems),
          },
          required: ["upside", "risks"],
          additionalProperties: false,
        },
      },
    );
    return Response.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "GOOGLE_API_KEY_MISSING") {
      return Response.json({ error: "Add GOOGLE_API_KEY to .env.local, then restart the development server." }, { status: 503 });
    }
    return Response.json({ error: "The AI gateway could not complete this request. Try again shortly." }, { status: 502 });
  }
}

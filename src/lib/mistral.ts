import type { ToolId } from "./models";

const BASE = "https://api.mistral.ai";

async function mistralFetch(apiKey: string, path: string, init: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "message" in json
        ? String((json as { message: unknown }).message)
        : text.slice(0, 400);
    throw new Error(`Mistral ${res.status}: ${msg}`);
  }
  return json;
}

export type ToolEvent = {
  type: string;
  name?: string;
  info?: string;
  content?: string;
};

export type ChatResult = {
  conversationId: string | null;
  text: string;
  events: ToolEvent[];
  images: string[];
};

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === "string") return chunk;
        if (chunk && typeof chunk === "object") {
          const c = chunk as Record<string, unknown>;
          if (typeof c.text === "string") return c.text;
          if (typeof c.content === "string") return c.content;
        }
        return "";
      })
      .join("");
  }
  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text: unknown }).text ?? "");
  }
  return "";
}

function collectImages(node: unknown, out: string[]) {
  if (!node) return;
  if (typeof node === "string") {
    if (node.startsWith("http") && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(node)) {
      out.push(node);
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectImages(item, out);
    return;
  }
  if (typeof node === "object") {
    const o = node as Record<string, unknown>;
    for (const key of ["image_url", "url", "file_url", "src"]) {
      if (typeof o[key] === "string" && String(o[key]).startsWith("http")) {
        out.push(String(o[key]));
      }
    }
    for (const v of Object.values(o)) collectImages(v, out);
  }
}

function parseOutputs(data: Record<string, unknown>): ChatResult {
  const outputs = Array.isArray(data.outputs) ? data.outputs : [];
  const events: ToolEvent[] = [];
  const images: string[] = [];
  let text = "";

  for (const raw of outputs) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const type = String(o.type ?? "");
    if (type === "message.output" || type === "message") {
      const t = extractText(o.content);
      if (t) text = t;
      collectImages(o.content, images);
    } else if (type === "tool.execution" || type === "function.call") {
      events.push({
        type,
        name: typeof o.name === "string" ? o.name : undefined,
        info:
          typeof o.info === "string"
            ? o.info
            : o.info
              ? JSON.stringify(o.info).slice(0, 2000)
              : undefined,
        content: extractText(o.content),
      });
      collectImages(o, images);
    }
  }

  if (!text) text = extractText(data);
  collectImages(data, images);

  return {
    conversationId:
      typeof data.conversation_id === "string" ? data.conversation_id : null,
    text: text.trim(),
    events,
    images: [...new Set(images)],
  };
}

export async function startOrContinueConversation(input: {
  apiKey: string;
  conversationId?: string | null;
  model: string;
  instructions?: string;
  tools: ToolId[];
  userText: string;
  temperature?: number;
}): Promise<ChatResult> {
  const tools = input.tools.map((type) => ({ type }));
  const payload: Record<string, unknown> = {
    inputs: [{ role: "user", content: input.userText }],
  };

  if (input.conversationId) {
    const data = (await mistralFetch(
      input.apiKey,
      `/v1/conversations/${input.conversationId}`,
      { method: "POST", body: JSON.stringify(payload) },
    )) as Record<string, unknown>;
    const parsed = parseOutputs(data);
    parsed.conversationId = input.conversationId;
    return parsed;
  }

  payload.model = input.model;
  if (input.instructions) payload.instructions = input.instructions;
  if (tools.length) payload.tools = tools;
  payload.completion_args = {
    temperature: input.temperature ?? 0.4,
  };

  const data = (await mistralFetch(input.apiKey, "/v1/conversations", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as Record<string, unknown>;
  return parseOutputs(data);
}

export async function runOcr(apiKey: string, documentBase64: string, mime: string) {
  const dataUrl = `data:${mime};base64,${documentBase64}`;
  const isPdf = mime === "application/pdf";
  const document = isPdf
    ? { type: "document_url", document_url: dataUrl }
    : { type: "image_url", image_url: dataUrl };

  const data = (await mistralFetch(apiKey, "/v1/ocr", {
    method: "POST",
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document,
      include_image_base64: false,
    }),
  })) as {
    pages?: Array<{ markdown?: string; text?: string }>;
  };
  const markdown =
    data.pages?.map((p) => p.markdown || p.text || "").join("\n\n") || "";
  return {
    markdown: markdown || "(пусто)",
    rawPreview: JSON.stringify(data).slice(0, 4000),
  };
}

export async function listRemoteModels(apiKey: string) {
  const data = (await mistralFetch(apiKey, "/v1/models", {
    method: "GET",
  })) as {
    data?: Array<{ id: string }>;
  };
  return (data.data ?? []).map((m) => m.id);
}

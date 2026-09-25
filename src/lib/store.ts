import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_INSTRUCTIONS, DEFAULT_MODEL, type ToolId } from "./models";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  events?: { type: string; name?: string }[];
  createdAt: number;
};

export type Thread = {
  id: string;
  title: string;
  conversationId: string | null;
  model: string;
  tools: ToolId[];
  instructions: string;
  temperature: number;
  messages: ChatMessage[];
  updatedAt: number;
};

function uid() {
  return crypto.randomUUID();
}

function blankThread(): Thread {
  return {
    id: uid(),
    title: "Новый диалог",
    conversationId: null,
    model: DEFAULT_MODEL,
    tools: ["web_search", "code_interpreter"],
    instructions: DEFAULT_INSTRUCTIONS,
    temperature: 0.4,
    messages: [],
    updatedAt: Date.now(),
  };
}

type State = {
  apiKey: string;
  threads: Thread[];
  activeId: string | null;
  sidebarOpen: boolean;
  setApiKey: (k: string) => void;
  setSidebarOpen: (v: boolean) => void;
  newThread: () => string;
  selectThread: (id: string) => void;
  deleteThread: (id: string) => void;
  updateThread: (id: string, patch: Partial<Thread>) => void;
  appendMessage: (id: string, msg: ChatMessage) => void;
  patchMessage: (
    threadId: string,
    msgId: string,
    patch: Partial<ChatMessage>,
  ) => void;
  ensureActive: () => string;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      apiKey: "",
      threads: [],
      activeId: null,
      sidebarOpen: false,
      setApiKey: (k) => set({ apiKey: k.trim() }),
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      newThread: () => {
        const t = blankThread();
        set({
          threads: [t, ...get().threads],
          activeId: t.id,
          sidebarOpen: false,
        });
        return t.id;
      },
      selectThread: (id) => set({ activeId: id, sidebarOpen: false }),
      deleteThread: (id) => {
        const next = get().threads.filter((t) => t.id !== id);
        const activeId =
          get().activeId === id ? (next[0]?.id ?? null) : get().activeId;
        set({ threads: next, activeId });
      },
      updateThread: (id, patch) =>
        set({
          threads: get().threads.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
          ),
        }),
      appendMessage: (id, msg) =>
        set({
          threads: get().threads.map((t) => {
            if (t.id !== id) return t;
            const title =
              t.messages.length === 0 && msg.role === "user"
                ? msg.content.slice(0, 48)
                : t.title;
            return {
              ...t,
              title,
              messages: [...t.messages, msg],
              updatedAt: Date.now(),
            };
          }),
        }),
      patchMessage: (threadId, msgId, patch) =>
        set({
          threads: get().threads.map((t) =>
            t.id !== threadId
              ? t
              : {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === msgId ? { ...m, ...patch } : m,
                  ),
                  updatedAt: Date.now(),
                },
          ),
        }),
      ensureActive: () => {
        const s = get();
        if (s.activeId && s.threads.some((t) => t.id === s.activeId)) {
          return s.activeId;
        }
        if (s.threads[0]) {
          set({ activeId: s.threads[0].id });
          return s.threads[0].id;
        }
        return get().newThread();
      },
    }),
    { name: "ermak-x-max" },
  ),
);

export function formatTime(ts: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}

export { uid };

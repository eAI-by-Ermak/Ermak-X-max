import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Globe,
  ImageIcon,
  KeyRound,
  Menu,
  Plus,
  ScanText,
  Send,
  Settings2,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import { startOrContinueConversation } from "../lib/mistral";
import { OcrPane } from "./OcrPane";
import { ModelsPane } from "./ModelsPane";
import { MODELS, TOOLS, type ToolId } from "../lib/models";
import { formatTime, uid, useStore, type ChatMessage } from "../lib/store";
import { MarkdownBody } from "./Markdown";

type Tab = "chat" | "ocr" | "models";

export function Studio() {
  const [tab, setTab] = useState<Tab>("chat");
  const [hydrated, setHydrated] = useState(false);
  const sidebarOpen = useStore((s) => s.sidebarOpen);

  useEffect(() => {
    useStore.getState().ensureActive();
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          color: "var(--muted)",
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>
          Ermak X Max
        </span>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar tab={tab} setTab={setTab} />
      {sidebarOpen ? (
        <button
          className="sidebar-overlay"
          aria-label="Закрыть меню"
          onClick={() => useStore.getState().setSidebarOpen(false)}
        />
      ) : null}
      <main className="main">
        {tab === "chat" ? <ChatPane /> : null}
        {tab === "ocr" ? <OcrPane /> : null}
        {tab === "models" ? <ModelsPane /> : null}
      </main>
    </div>
  );
}

function Sidebar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const threads = useStore((s) => s.threads);
  const activeId = useStore((s) => s.activeId);
  const open = useStore((s) => s.sidebarOpen);

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="brand" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div className="title">Ermak X Max</div>
          <div className="sub">Mistral studio</div>
        </div>
        <button
          className="icon-btn"
          style={{ display: undefined }}
          onClick={() => useStore.getState().setSidebarOpen(false)}
          aria-label="Закрыть"
        >
          <X size={16} className="mobile-only" />
        </button>
      </div>

      <div style={{ padding: "0 0.75rem" }}>
        <button
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={() => {
            useStore.getState().newThread();
            setTab("chat");
          }}
        >
          <Plus size={16} />
          Новый чат
        </button>
      </div>

      <nav className="nav-tabs">
        {(
          [
            ["chat", "Чат", Sparkles],
            ["ocr", "OCR", ScanText],
            ["models", "Модели", Bot],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            className={`nav-tab${tab === id ? " active" : ""}`}
            onClick={() => setTab(id)}
          >
            <Icon size={14} style={{ marginBottom: 2 }} />
            {label}
          </button>
        ))}
      </nav>

      <div className="section-label">Диалоги</div>
      <div className="thread-list">
        {threads.length === 0 ? (
          <p style={{ padding: "0 0.5rem", fontSize: 14, color: "var(--faint)" }}>
            Пока пусто
          </p>
        ) : (
          threads.map((t) => (
            <div
              key={t.id}
              className={`thread-item${t.id === activeId ? " active" : ""}`}
            >
              <button
                className="pick"
                onClick={() => {
                  useStore.getState().selectThread(t.id);
                  setTab("chat");
                }}
              >
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 14,
                  }}
                >
                  {t.title || "Без названия"}
                </div>
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 11,
                    color: "var(--faint)",
                  }}
                >
                  {t.model}
                </div>
              </button>
              <button
                className="icon-btn"
                onClick={() => useStore.getState().deleteThread(t.id)}
                aria-label="Удалить"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function ChatPane() {
  const threads = useStore((s) => s.threads);
  const activeId = useStore((s) => s.activeId);
  const apiKey = useStore((s) => s.apiKey);
  const thread = threads.find((t) => t.id === activeId) ?? threads[0];
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [thread?.messages.length, busy]);

  if (!thread) return null;

  async function onSend() {
    const text = draft.trim();
    if (!text || busy) return;
    if (!apiKey) {
      setError("Вставь Mistral API key в Настройках");
      setSettings(true);
      return;
    }
    setDraft("");
    setError(null);
    setBusy(true);
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    useStore.getState().appendMessage(thread.id, userMsg);
    const assistantId = uid();
    useStore.getState().appendMessage(thread.id, {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    });
    try {
      const latest = useStore.getState().threads.find((t) => t.id === thread.id)!;
      const res = await startOrContinueConversation({
        apiKey,
        conversationId: latest.conversationId,
        model: latest.model,
        instructions: latest.instructions,
        tools: latest.tools,
        userText: text,
        temperature: latest.temperature,
      });
      useStore.getState().updateThread(thread.id, {
        conversationId: res.conversationId,
      });
      useStore.getState().patchMessage(thread.id, assistantId, {
        content: res.text || "(пустой ответ)",
        images: res.images,
        events: res.events.map((e) => ({ type: e.type, name: e.name })),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка запроса";
      setError(msg);
      useStore.getState().patchMessage(thread.id, assistantId, {
        content: `Не удалось получить ответ.\n\n\`${msg}\`,
      });
    } finally {
      setBusy(false);
      ta.current?.focus();
    }
  }

  return (
    <>
      <header className="header">
        <button
          className="icon-btn"
          onClick={() => useStore.getState().setSidebarOpen(true)}
          aria-label="Меню"
          style={{ display: "inline-flex" }}
        >
          <Menu size={20} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            {thread.title}
          </div>
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 12,
              color: "var(--faint)",
            }}
          >
            {MODELS.find((m) => m.id === thread.model)?.label ?? thread.model}
            {thread.tools.length ? ` · ${thread.tools.length} tools` : ""}
          </div>
        </div>
        <button className="btn" onClick={() => setSettings((v) => !v)}>
          <Settings2 size={16} />
          <span className="hide-sm">Настройки</span>
        </button>
      </header>

      {settings ? <SettingsBar threadId={thread.id} /> : null}

      <div ref={scroller} className="messages">
        {thread.messages.length === 0 ? (
          <EmptyState
            onPick={(q) => {
              setDraft(q);
              ta.current?.focus();
            }}
          />
        ) : (
          <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
            {thread.messages.map((m) => (
              <MessageBubble
                key={m.id}
                msg={m}
                pending={busy && !m.content && m.role === "assistant"}
              />
            ))}
          </div>
        )}
      </div>

      <div className="composer">
        {error ? (
          <p className="error" style={{ maxWidth: "48rem", margin: "0 auto 0.5rem" }}>
            {error}
          </p>
        ) : null}
        <form
          className="composer-box"
          onSubmit={(e) => {
            e.preventDefault();
            void onSend();
          }}
        >
          <textarea
            ref={ta}
            value={draft}
            rows={1}
            placeholder="Сообщение… Markdown, поиск, код, картинки."
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "2.75rem", padding: 0 }}
            disabled={busy || !draft.trim()}
            aria-label="Отправить"
          >
            {busy ? <Square size={16} /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </>
  );
}

function SettingsBar({ threadId }: { threadId: string }) {
  const thread = useStore((s) => s.threads.find((t) => t.id === threadId));
  const apiKey = useStore((s) => s.apiKey);
  if (!thread) return null;
  const upd = (patch: Partial<typeof thread>) =>
    useStore.getState().updateThread(threadId, patch);

  return (
    <div className="settings-bar">
      <div className="grid-2">
        <label className="label span-2">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <KeyRound size={12} /> Mistral API key (только в этом браузере)
          </span>
          <input
            className="field"
            style={{ marginTop: 6 }}
            type="password"
            autoComplete="off"
            placeholder="sk-…"
            value={apiKey}
            onChange={(e) => useStore.getState().setApiKey(e.target.value)}
          />
        </label>
        <label className="label">
          Модель
          <select
            className="field"
            style={{ marginTop: 6, height: "2.75rem" }}
            value={thread.model}
            onChange={(e) =>
              upd({ model: e.target.value, conversationId: null })
            }
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.hint}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Температура {thread.temperature.toFixed(1)}
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={thread.temperature}
            style={{ width: "100%", marginTop: 14 }}
            onChange={(e) => upd({ temperature: Number(e.target.value) })}
          />
        </label>
        <div className="span-2">
          <div className="label" style={{ marginBottom: 8 }}>
            Инструменты Conversations API
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TOOLS.map((tool) => {
              const on = thread.tools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  className={`btn-chip${on ? " on" : ""}`}
                  onClick={() => {
                    const next = on
                      ? thread.tools.filter((id) => id !== tool.id)
                      : [...thread.tools, tool.id];
                    upd({ tools: next as ToolId[], conversationId: null });
                  }}
                >
                  {tool.label}
                </button>
              );
            })}
          </div>
        </div>
        <label className="label span-2">
          Системный промпт
          <textarea
            className="field"
            style={{ marginTop: 6, minHeight: 80 }}
            value={thread.instructions}
            onChange={(e) =>
              upd({ instructions: e.target.value, conversationId: null })
            }
          />
        </label>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const prompts = [
    { icon: Globe, t: "Найди свежие новости по Mistral Medium 3.5" },
    {
      icon: Terminal,
      t: "Посчитай code interpreter: сумма ряда 1/n² до n=200",
    },
    {
      icon: ImageIcon,
      t: "Сгенерируй изображение: тихая библиотека вечером, тёплый свет",
    },
  ];
  return (
    <div className="empty">
      <h1>Думать. Искать. Писать.</h1>
      <p>
        Conversations API: web search, code interpreter, image generation.
        Markdown, история на этом устройстве. Ключ — только в настройках.
      </p>
      <div className="prompt-list">
        {prompts.map((p) => (
          <button key={p.t} type="button" onClick={() => onPick(p.t)}>
            <p.icon size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
            {p.t}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  pending,
}: {
  msg: ChatMessage;
  pending?: boolean;
}) {
  const mine = msg.role === "user";
  return (
    <article className={`bubble-row ${mine ? "user" : "assistant"}`}>
      <div className="bubble">
        <div className="meta">
          <span>{mine ? "Вы" : "Ermak X"}</span>
          <span>{formatTime(msg.createdAt)}</span>
        </div>
        {pending ? (
          <div style={{ fontSize: 14, color: "var(--muted)" }}>Думаю…</div>
        ) : (
          <MarkdownBody text={msg.content} />
        )}
        {msg.events?.length ? (
          <div style={{ marginTop: 8 }}>
            {msg.events.map((e, i) => (
              <span key={i} className="event-chip">
                {e.name ?? e.type}
              </span>
            ))}
          </div>
        ) : null}
        {msg.images?.length ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {msg.images.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                style={{
                  maxHeight: 320,
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  objectFit: "contain",
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export { OcrPane } from "./OcrPane";
export { ModelsPane } from "./ModelsPane";

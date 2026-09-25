import { useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { listRemoteModels } from "../lib/mistral";
import { MODELS } from "../lib/models";
import { useStore } from "../lib/store";

export function ModelsPane() {
  const apiKey = useStore((s) => s.apiKey);
  const [ids, setIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    listRemoteModels(apiKey)
      .then(setIds)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "fail"),
      );
  }, [apiKey]);

  const grouped = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const m of MODELS) {
      const list = groups.get(m.group) ?? [];
      list.push(`${m.label} · ${m.id}`);
      groups.set(m.group, list);
    }
    return groups;
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <header className="header">
        <button
          className="icon-btn"
          onClick={() => useStore.getState().setSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>
        <div>
          <div style={{ fontWeight: 500 }}>Ключ и модели</div>
          <div style={{ fontSize: 12, color: "var(--faint)" }}>
            Small, Medium, Magistral, Codestral, OCR. Large — зависит от тарифа.
          </div>
        </div>
      </header>
      <div
        style={{
          maxWidth: "48rem",
          width: "100%",
          margin: "0 auto",
          padding: "1rem",
          flex: 1,
          overflowY: "auto",
        }}
      >
        {[...grouped.entries()].map(([g, items]) => (
          <section key={g} style={{ marginBottom: 24 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                letterSpacing: "-0.02em",
                margin: "0 0 8px",
              }}
            >
              {g}
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {items.map((it) => (
                <li
                  key={it}
                  style={{
                    border: "1px solid var(--line)",
                    background: "var(--panel)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontSize: 14,
                  }}
                >
                  {it}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.25rem",
              letterSpacing: "-0.02em",
            }}
          >
            Живой список API
          </h2>
          {!apiKey ? (
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              Добавь API key в настройках чата, чтобы подтянуть список моделей.
            </p>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          {!ids && apiKey && !error ? (
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Загружаю…</p>
          ) : null}
          {ids ? (
            <ul
              style={{
                columns: 2,
                gap: 24,
                fontSize: 12,
                color: "var(--muted)",
                fontFamily: "var(--font-mono)",
                paddingLeft: 18,
              }}
            >
              {ids.map((id) => (
                <li key={id} style={{ marginBottom: 4, breakInside: "avoid" }}>
                  {id}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  );
}

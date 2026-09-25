import { useState } from "react";
import { Menu, ScanText } from "lucide-react";
import { runOcr } from "../lib/mistral";
import { useStore } from "../lib/store";
import { MarkdownBody } from "./Markdown";

export function OcrPane() {
  const apiKey = useStore((s) => s.apiKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState("");

  async function onFile(file: File) {
    if (!apiKey) {
      setError("Вставь API key в Настройках чата");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      bytes.forEach((b) => {
        binary += String.fromCharCode(b);
      });
      const base64 = btoa(binary);
      const data = await runOcr(apiKey, base64, file.type || "image/jpeg");
      setResult(data.markdown || data.rawPreview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed");
    } finally {
      setBusy(false);
    }
  }

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
          <div style={{ fontWeight: 500 }}>OCR 4.x</div>
          <div style={{ fontSize: 12, color: "var(--faint)" }}>
            Изображения и PDF через mistral-ocr-latest
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
        <label className="drop">
          <ScanText size={24} style={{ marginBottom: 8 }} />
          {busy ? "Читаю документ…" : "Перетащите файл или нажмите, чтобы выбрать"}
          <input
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </label>
        {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}
        {result ? (
          <div
            style={{
              marginTop: 24,
              border: "1px solid var(--line)",
              background: "var(--panel)",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <MarkdownBody text={result} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

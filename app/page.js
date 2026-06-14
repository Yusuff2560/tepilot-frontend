"use client";
import { useState, useRef, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

function useWake() {
  const [wakeState, setWakeState] = useState("checking"); // checking | waking | ready
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval;
    let cancelled = false;

    async function ping() {
      // Start fake progress
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 92) return p;
          return p + (p < 40 ? 4 : p < 70 ? 2 : 0.5);
        });
      }, 400);

      try {
        const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(30000) });
        if (!cancelled && res.ok) {
          setProgress(100);
          setTimeout(() => { if (!cancelled) setWakeState("ready"); }, 600);
        }
      } catch {
        // retry
        if (!cancelled) {
          setWakeState("waking");
          setTimeout(ping, 3000);
        }
      }
    }

    // Quick check first
    fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) })
      .then(r => { if (r.ok && !cancelled) { setProgress(100); setTimeout(() => { if (!cancelled) setWakeState("ready"); }, 300); } })
      .catch(() => { if (!cancelled) { setWakeState("waking"); ping(); } });

    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { wakeState, progress };
}

export default function Home() {
  const { wakeState, progress } = useWake();
  const [messages, setMessages] = useState([
    { role: "assistant", content: "TePilot hazır. Bir URL ver ya da görev tanımla." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState([]);
  const [activeShot, setActiveShot] = useState(null);
  const [cursor, setCursor] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim() || loading || wakeState !== "ready") return;
    const userMsg = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data.screenshots?.length) {
        setScreenshots(data.screenshots);
        setActiveShot(data.screenshots[data.screenshots.length - 1]);
      }
      setMessages(m => [...m, { role: "assistant", content: data.response || data.error }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Bağlantı hatası." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const statusLine = wakeState === "ready"
    ? `TEPILOT > ready${cursor ? "_" : " "}`
    : wakeState === "waking"
    ? `TEPILOT > waking up... ${Math.round(progress)}%`
    : `TEPILOT > connecting${cursor ? "." : " "}`;

  return (
    <div className="root">
      {/* Status bar */}
      <div className="statusbar">
        <span className="statusbar-text">{statusLine}</span>
        {wakeState !== "ready" && (
          <div className="wake-bar">
            <div className="wake-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
        <span className="statusbar-right">
          <span className={`dot ${wakeState === "ready" ? "green" : "yellow"}`} />
          {wakeState === "ready" ? "live" : "starting"}
        </span>
      </div>

      <div className="body">
        {/* Chat */}
        <aside className="sidebar">
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <span className="msg-prefix">{m.role === "user" ? "> " : "~ "}</span>
                <pre className="msg-text">{m.content}</pre>
              </div>
            ))}
            {loading && (
              <div className="msg assistant">
                <span className="msg-prefix">~ </span>
                <span className="thinking">
                  <span /><span /><span />
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="input-row">
            <span className="input-prompt">&gt;</span>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={wakeState !== "ready" ? "uyanıyor..." : "komut ver"}
              disabled={loading || wakeState !== "ready"}
              rows={1}
              className="input"
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim() || wakeState !== "ready"}
            >▲</button>
          </div>
        </aside>

        {/* Divider */}
        <div className="divider" />

        {/* Browser canvas */}
        <main className="canvas">
          <div className="canvas-header">
            <span className="canvas-label">browser canvas</span>
            {activeShot && screenshots.length > 1 && (
              <span className="shot-count">{screenshots.length} frames</span>
            )}
          </div>

          <div className="canvas-view">
            {activeShot ? (
              <img
                src={`data:image/jpeg;base64,${activeShot}`}
                alt="browser"
                className="shot-img"
              />
            ) : (
              <div className="canvas-empty">
                <div className="empty-grid" />
                <p className="empty-text">tarayıcı bekleniyor</p>
              </div>
            )}
          </div>

          {screenshots.length > 1 && (
            <div className="filmstrip">
              {screenshots.map((s, i) => (
                <button
                  key={i}
                  className={`film-thumb ${s === activeShot ? "active" : ""}`}
                  onClick={() => setActiveShot(s)}
                >
                  <img src={`data:image/jpeg;base64,${s}`} alt={`frame ${i+1}`} />
                  <span className="frame-num">{i + 1}</span>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080812;
          color: #c8c8e0;
          font-family: 'Berkeley Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', ui-monospace, monospace;
          height: 100vh;
          overflow: hidden;
        }

        .root { display: flex; flex-direction: column; height: 100vh; }

        /* STATUS BAR */
        .statusbar {
          height: 32px;
          background: #0a0a18;
          border-bottom: 1px solid #1c1c38;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 16px;
          flex-shrink: 0;
        }
        .statusbar-text {
          font-size: 11px;
          color: #7c5cfc;
          letter-spacing: 0.06em;
          font-weight: 600;
          min-width: 260px;
        }
        .wake-bar {
          flex: 1;
          max-width: 200px;
          height: 2px;
          background: #1c1c38;
          border-radius: 1px;
          overflow: hidden;
        }
        .wake-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c5cfc, #00e5a0);
          transition: width 0.4s ease;
        }
        .statusbar-right {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #4a4a6a;
          letter-spacing: 0.04em;
        }
        .dot {
          width: 6px; height: 6px; border-radius: 50%;
        }
        .dot.green { background: #00e5a0; box-shadow: 0 0 6px #00e5a080; }
        .dot.yellow { background: #f5a623; box-shadow: 0 0 6px #f5a62380; animation: pulse 1.5s ease infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* BODY */
        .body { display: flex; flex: 1; overflow: hidden; }

        /* SIDEBAR */
        .sidebar {
          width: 360px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: #080812;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          scrollbar-width: thin;
          scrollbar-color: #1c1c38 transparent;
        }

        .msg { display: flex; gap: 6px; align-items: flex-start; }
        .msg-prefix {
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 1px;
          line-height: 1.6;
        }
        .msg.user .msg-prefix { color: #7c5cfc; }
        .msg.assistant .msg-prefix { color: #00e5a0; }

        .msg-text {
          font-family: inherit;
          font-size: 12.5px;
          line-height: 1.65;
          white-space: pre-wrap;
          word-break: break-word;
          color: #b8b8d0;
        }
        .msg.user .msg-text { color: #e0e0f0; }

        .thinking { display: flex; gap: 4px; align-items: center; padding-top: 4px; }
        .thinking span {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #00e5a0;
          opacity: 0.4;
          animation: blink 1.2s ease infinite;
        }
        .thinking span:nth-child(2) { animation-delay: 0.2s; }
        .thinking span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }

        /* INPUT */
        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 10px 14px 14px;
          border-top: 1px solid #12122a;
        }
        .input-prompt {
          color: #7c5cfc;
          font-size: 13px;
          font-weight: 700;
          padding-bottom: 9px;
          flex-shrink: 0;
        }
        .input {
          flex: 1;
          background: transparent;
          border: none;
          border-bottom: 1px solid #2a2a4a;
          color: #e0e0f0;
          font-family: inherit;
          font-size: 12.5px;
          padding: 6px 0 8px;
          resize: none;
          outline: none;
          line-height: 1.5;
          max-height: 80px;
          overflow-y: auto;
          transition: border-color 0.15s;
        }
        .input:focus { border-bottom-color: #7c5cfc; }
        .input::placeholder { color: #2e2e4e; }
        .input:disabled { opacity: 0.4; }

        .send-btn {
          width: 28px; height: 28px;
          background: #7c5cfc;
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 11px;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s, transform 0.1s;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 2px;
        }
        .send-btn:hover:not(:disabled) { background: #9070ff; transform: translateY(-1px); }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* DIVIDER */
        .divider {
          width: 1px;
          background: linear-gradient(to bottom, transparent, #7c5cfc40, #00e5a030, transparent);
          flex-shrink: 0;
        }

        /* CANVAS */
        .canvas {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #060610;
        }
        .canvas-header {
          height: 32px;
          border-bottom: 1px solid #12122a;
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 10px;
          flex-shrink: 0;
        }
        .canvas-label { font-size: 10px; color: #2e2e5e; letter-spacing: 0.1em; text-transform: uppercase; }
        .shot-count { font-size: 10px; color: #7c5cfc; margin-left: auto; }

        .canvas-view {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .shot-img {
          width: 100%; height: 100%;
          object-fit: contain;
          display: block;
        }

        .canvas-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          position: relative;
        }
        .empty-grid {
          width: 280px; height: 180px;
          background-image:
            linear-gradient(#1a1a2e 1px, transparent 1px),
            linear-gradient(90deg, #1a1a2e 1px, transparent 1px);
          background-size: 28px 28px;
          border: 1px solid #1a1a2e;
          border-radius: 4px;
          opacity: 0.5;
        }
        .empty-text {
          font-size: 11px;
          color: #2e2e4e;
          letter-spacing: 0.08em;
          position: absolute;
          bottom: -28px;
        }

        /* FILMSTRIP */
        .filmstrip {
          height: 64px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-top: 1px solid #12122a;
          overflow-x: auto;
          flex-shrink: 0;
          scrollbar-width: thin;
          scrollbar-color: #1c1c38 transparent;
        }
        .film-thumb {
          position: relative;
          width: 84px; height: 48px;
          flex-shrink: 0;
          border: 1px solid #1c1c38;
          border-radius: 3px;
          overflow: hidden;
          background: none;
          cursor: pointer;
          padding: 0;
          opacity: 0.55;
          transition: opacity 0.15s, border-color 0.15s;
        }
        .film-thumb:hover { opacity: 0.85; }
        .film-thumb.active { border-color: #7c5cfc; opacity: 1; }
        .film-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .frame-num {
          position: absolute;
          bottom: 2px; right: 4px;
          font-size: 9px;
          color: #7c5cfc;
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
